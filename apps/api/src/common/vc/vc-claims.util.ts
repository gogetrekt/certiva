import { createHash } from 'node:crypto';

import { normalizeValue } from '../../modules/credential/credential.utils';

/**
 * Credential -> Open Badges 3.0 / W3C VC 2.0 claim set. Pure functions, no I/O,
 * no Prisma — same shape as credential.utils.ts, so the mapping is testable on
 * its own and the signer has nothing to reason about but bytes.
 *
 * Vocabulary is Open Badges 3.0 with NO Certiva-owned @context: a custom context
 * URL that ever goes dark would make every credential already issued impossible
 * to expand, permanently. Every field below fits a term OBv3 already defines
 * (verified against ob_v3p0_achievementcredential_schema.json).
 */

export const VC_CONTEXT_V2 = 'https://www.w3.org/ns/credentials/v2';
export const OPEN_BADGES_V3_CONTEXT =
  'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json';

/**
 * OBv3 requires `achievementType` from a fixed enumeration. Held constant on
 * purpose: parsing Indonesian degree strings ("S1", "Sarjana", "S.Kom.", "M.T.")
 * into BachelorDegree/MasterDegree/DoctoralDegree guesses wrong on real data,
 * and a wrong guess is a wrong academic claim inside a signed document. If this
 * ever needs to be precise, it comes from an institution-curated per-programme
 * mapping table, not a parser.
 */
const ACHIEVEMENT_TYPE = 'Degree';

const CRITERIA_NARRATIVE =
  'Awarded by the issuing institution on completion of the named study programme. ' +
  'Authenticity of this record is verifiable against the institution registry.';

export interface OpenBadgeCredentialInput {
  /** Credential.credentialExternalId — the id in the public /verify/:id route. */
  credentialId: string;
  issuerId: string;
  /** Issuer.domain — the Certiva-operated verification subdomain. */
  issuerDomain: string;
  issuerName: string;
  studentName: string;
  studentId: string;
  degree: string;
  graduationYear: number | null;
  issuedAt: Date;
}

/**
 * Issuer.domain is admin-entered, so it may arrive with a scheme or a trailing
 * slash. did:web and the credential IRI must both come out of one normalised
 * host or the DID will not resolve.
 */
export function normalizeIssuerDomain(domain: string): string {
  return domain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

export function buildIssuerDid(issuerDomain: string): string {
  return `did:web:${normalizeIssuerDomain(issuerDomain)}`;
}

/** DID URL of one signing key, e.g. did:web:verify.univ.ac.id#sk_a1b2c3. */
export function buildVerificationMethodId(
  issuerDomain: string,
  keyId: string,
): string {
  return `${buildIssuerDid(issuerDomain)}#${keyId}`;
}

/** Resolvable credential IRI — the same URL a human would open to verify. */
export function buildCredentialIri(
  issuerDomain: string,
  credentialId: string,
): string {
  return `https://${normalizeIssuerDomain(issuerDomain)}/verify/${credentialId}`;
}

/**
 * Stable per (institution, programme) achievement IRI. A `urn:` rather than an
 * https URL on purpose: an https achievement id would be a promise to keep that
 * path alive forever, and nothing about verification needs it to resolve.
 */
export function buildAchievementIri(degree: string, issuerId: string): string {
  const digest = createHash('sha256')
    .update(`${normalizeValue(degree)}\n${issuerId}`, 'utf8')
    .digest('hex');
  return `urn:certiva:achievement:${digest.slice(0, 16)}`;
}

export function buildOpenBadgeCredential(
  input: OpenBadgeCredentialInput,
): Record<string, unknown> {
  const domain = normalizeIssuerDomain(input.issuerDomain);
  const issuedAt = input.issuedAt.toISOString();
  const credentialIri = buildCredentialIri(domain, input.credentialId);
  const degree = normalizeValue(input.degree);
  const issuerName = normalizeValue(input.issuerName);

  const credentialSubject: Record<string, unknown> = {
    type: ['AchievementSubject'],
    // OBv3 AchievementSubject has no `name` property; recipient identity is a
    // list of IdentityObject, and "name"/"sourcedId" are both in
    // IdentifierTypeEnum. `hashed: false` means plaintext — the same values are
    // already printed on the diploma and inside the signed publicPayload, so
    // hashing here would protect nothing while making the export unreadable.
    identifier: [
      {
        type: 'IdentityObject',
        hashed: false,
        identityType: 'name',
        identityHash: normalizeValue(input.studentName),
      },
      {
        type: 'IdentityObject',
        hashed: false,
        identityType: 'sourcedId',
        identityHash: normalizeValue(input.studentId),
      },
    ],
    achievement: {
      id: buildAchievementIri(degree, input.issuerId),
      type: ['Achievement'],
      achievementType: ACHIEVEMENT_TYPE,
      name: degree,
      description: `${degree} awarded by ${issuerName}.`,
      criteria: { narrative: CRITERIA_NARRATIVE },
    },
  };

  // `term` (string), not `activityEndDate` (DateTime): we only know the year,
  // and padding it to a full timestamp would invent precision we do not have.
  if (input.graduationYear !== null) {
    credentialSubject.term = String(input.graduationYear);
  }

  // No credentialSubject.id: the graduate has no DID yet, and a urn: derived
  // from studentId would be a fake subject identifier.
  return {
    '@context': [VC_CONTEXT_V2, OPEN_BADGES_V3_CONTEXT],
    id: credentialIri,
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: {
      id: buildIssuerDid(domain),
      type: ['Profile'],
      name: issuerName,
      url: `https://${domain}`,
    },
    validFrom: issuedAt,
    awardedDate: issuedAt,
    credentialSubject,
    evidence: [
      {
        type: ['Evidence'],
        id: credentialIri,
        name: 'Certiva registry verification',
      },
    ],
  };
}
