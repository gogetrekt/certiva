# Verifiable Credential export (W3C VC 2.0 + `did:web`)

Certiva credentials can be exported as W3C Verifiable Credentials so that systems
outside Certiva can verify them with off-the-shelf tooling. This is **additive**:
`GET /api/verification/:credentialId/proof` and the Ed25519 signature behind it
are unchanged, and remain the simplest way to verify a credential with no VC
library at all.

## What the export is

| | |
|---|---|
| Data model | W3C Verifiable Credentials 2.0 |
| Vocabulary | Open Badges 3.0 (`https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json`) |
| Proof | `DataIntegrityProof`, cryptosuite `eddsa-jcs-2022` |
| Signature | Ed25519, the institution's existing signing key — no new key material |
| Issuer identity | `did:web:<verification-domain>` |

No Certiva-hosted JSON-LD `@context` is involved. A context URL under our control
that ever went dark would make every credential already issued impossible to
expand — permanently. Every field maps onto a term Open Badges 3.0 already
defines.

## Endpoints

| Route | Purpose |
|---|---|
| `GET /api/verification/:credentialId/vc` | The credential as a secured VC (`application/vc+ld+json`) |
| `GET /api/institution/did.json` | The institution's DID document |
| `GET /.well-known/did.json` | Where a `did:web` resolver actually looks (served by the web container, proxies the route above) |
| `GET /api/institution/public-keys` | Authoritative key status, including `revokedAt` |

Status codes on the export endpoint:

- `404` — no VC proof stored for this credential (issued before the export
  existed and skipped by the backfill, see below).
- `410` — the credential has been revoked or deleted. No document is returned.

## Verifying it yourself

The proof is a standard `eddsa-jcs-2022` Data Integrity proof, so any conforming
implementation works. With digitalbazaar's libraries:

```bash
npm i @digitalbazaar/vc @digitalbazaar/data-integrity \
      @digitalbazaar/eddsa-jcs-2022-cryptosuite
```

```js
import * as vc from '@digitalbazaar/vc';
import { DataIntegrityProof } from '@digitalbazaar/data-integrity';
import { createVerifyCryptosuite } from '@digitalbazaar/eddsa-jcs-2022-cryptosuite';

const credential = await (
  await fetch('https://verify.your-univ.ac.id/api/verification/crd_xxx/vc')
).json();

const result = await vc.verifyCredential({
  credential,
  suite: new DataIntegrityProof({ cryptosuite: createVerifyCryptosuite() }),
  documentLoader, // must resolve did:web:<domain> and the two @context URLs
});
```

The DID document at `https://<domain>/.well-known/did.json` publishes each
signing key as a `Multikey`, which is what the verification method in the proof
points at (`did:web:<domain>#<keyId>`).

If you would rather not pull in a VC library, the bytes covered by the signature
are, per the cryptosuite:

```
SHA-256( JCS(proof without proofValue) ) || SHA-256( JCS(document without proof) )
```

where `JCS` is RFC 8785 JSON canonicalization, and the proof's `@context` is the
document's `@context`. `apps/api/src/common/vc/vc-proof.util.ts`
(`extractVerificationInput`) is a working reference implementation of exactly
this, in ~20 lines.

## What the signature does and does not prove

**Proves:** the credential content is authentic and has not been altered since
issuance, and it was signed by a key the institution publishes as its own.

**Does not prove:** that the credential is still valid today.

The export carries no `credentialStatus` list, so a downloaded file cannot tell
you about revocation. Revocation is checked at request time instead: a revoked
credential returns `410` from the export endpoint and is reported as revoked by
the verification page and `/proof`. A verifier that needs current status must
re-contact this server. Please do not describe an offline check of a downloaded
VC as proof that a degree is currently valid — it is not.

## Key rotation and the DID document

The DID document is **append-only**: retired keys stay in both
`verificationMethod` and `assertionMethod`. `did:web` has no version history, so
removing a retired key would break verification for every credential it ever
signed — credentials Certiva still considers valid (rotation revokes keys, it
never deletes them).

The consequence, stated plainly: a *leaked* key cannot be disabled by editing
this document. Authoritative key status lives at
`GET /api/institution/public-keys` (`revokedAt` per key) and in the `/proof`
bundle. Treat the DID document as "keys this institution has used", not "keys
that are currently trusted".

## Backfilling credentials issued before the export existed

```bash
pnpm --filter api exec ts-node scripts/backfill-vc-proof.ts --dry-run
pnpm --filter api exec ts-node scripts/backfill-vc-proof.ts
```

Re-running it is safe: credentials that already have a proof are left alone.

Credentials whose signing key has since been revoked are **skipped and listed**,
not re-signed — signing new material with a retired key would defeat the point of
retiring it. Those credentials keep verifying through `/proof`; they simply have
no VC export.
