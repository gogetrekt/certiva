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

## Field mapping

| Credential field | Location in the VC |
|---|---|
| `credentialExternalId` | `id` → `https://<domain>/verify/<credentialExternalId>` |
| `Issuer.domain` | `issuer.id` → `did:web:<domain>`; `issuer.url` → `https://<domain>` |
| `Issuer.displayName ?? name` | `issuer.name` |
| `issuedAt` | `validFrom` and `awardedDate` |
| `studentName` | `credentialSubject.identifier[]` → `IdentityObject` with `identityType: "name"` |
| `studentId` | `credentialSubject.identifier[]` → `IdentityObject` with `identityType: "sourcedId"` |
| `degree` | `credentialSubject.achievement.name` (+ `description`) |
| `graduationYear` | `credentialSubject.term` (string). Omitted when unknown. |
| `verificationUrl` | `evidence[0].id` |
| `verificationCode` | **Not included** — same exclusion as the signed public payload |
| — | `credentialSubject.id` is **not** set: the graduate has no DID yet, and a `urn:` derived from `studentId` would be a fabricated subject identifier |
| — | `credentialSubject.achievement.achievementType` is the constant `"Degree"` |

`achievementType` is held constant deliberately. Parsing Indonesian degree strings
("S1", "Sarjana", "S.Kom.", "M.T.") into `BachelorDegree`/`MasterDegree`/
`DoctoralDegree` guesses wrong on real data, and a wrong guess is a wrong academic
claim inside a signed document. If precision is ever needed it should come from an
institution-curated per-programme mapping table, not a parser.

Recipient identifiers are OBv3 `IdentityObject` entries with `hashed: false`
(plaintext). OBv3 does support hashed identifiers, but the same values are already
printed on the certificate and already covered by the signed public payload, so
hashing them here would protect nothing while making the document unusable. See
[COMPLIANCE.md](COMPLIANCE.md) §2 for the privacy consequences of that choice.

## Endpoints

| Route | Purpose |
|---|---|
| `GET /api/verification/:credentialId/vc` | The credential as a secured VC (`application/vc+ld+json`) |
| `GET /api/institution/did.json` | The institution's DID document |
| `GET /.well-known/did.json` | Where a `did:web` resolver actually looks (served by the web container, proxies the route above) |
| `GET /api/institution/public-keys` | Authoritative key status, including `revokedAt` |

Status codes on the export endpoint:

- `404` — no signed VC document stored for this credential (issued before the
  export existed and skipped by the backfill, see below). The document is served
  exactly as it was signed, never rebuilt from the current `Issuer` row: an
  institution renaming itself or changing its domain would otherwise invalidate
  the proof on every credential it had already issued.
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

### Two details that will silently break verification

Both were found by running a third-party verifier against the output rather than
by reading the spec, and both are covered by regression tests
(`apps/api/src/common/vc/vc-proof.util.spec.ts`).

1. **The published proof must carry `@context`, equal to the document's.** The
   cryptosuite copies the unsecured document's `@context` onto the proof options
   *before* hashing, and a verifier reconstructs the hash from the proof exactly
   as published. Stripping `@context` from the proof — or substituting a
   different one — makes every conforming verifier report `Invalid signature.`
   even though the underlying Ed25519 operation is correct. This is an easy bug
   to misdiagnose as "the library is being difficult".
2. **Recipient identity is `IdentityObject`, not `IdentifierEntry`.** OBv3 uses
   `IdentifierEntry` elsewhere (e.g. `Achievement.otherIdentifier`), but
   `AchievementSubject.identifier` takes `IdentityObject` — requiring `type`,
   `hashed`, `identityType`, and `identityHash`. Getting this wrong produces a
   document that signs and verifies fine but fails OBv3 schema validation.

### JCS implementation

Canonicalization uses `canonicalize`, pinned to exactly `2.1.0`. Two notes for
anyone tempted to bump it:

- `3.0.0` is ESM-only and cannot be `require`d from this CJS build. `2.1.0` is the
  last CJS release. If `apps/api` ever moves to ESM, upgrading is mechanical.
- Staying on an older line is acceptable here specifically because JCS is a frozen
  specification (RFC 8785, 2020) — the algorithm does not evolve. Both versions
  are published by the same author (Samuel Erdtman, a co-author of RFC 8785), from
  the same repository, with no runtime dependencies.

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

# then capture the signed document itself, for credentials that predate the
# `vcDocument` snapshot column:
pnpm --filter api exec ts-node scripts/backfill-vc-document.ts --dry-run
pnpm --filter api exec ts-node scripts/backfill-vc-document.ts
```

Re-running either is safe: credentials that already have a proof (or a snapshot)
are left alone.

The snapshot script rebuilds each document from the current `Issuer` row and
verifies it against the stored proof before writing. If they disagree, the
institution's name or domain changed after signing and that credential's VC has
been failing verification ever since — it is re-signed over the current document,
which the script reports. Credentials with a revoked key are skipped instead.

Credentials whose signing key has since been revoked are **skipped and listed**,
not re-signed — signing new material with a retired key would defeat the point of
retiring it. Those credentials keep verifying through `/proof`; they simply have
no VC export.
