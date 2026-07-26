import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { RateLimit, RATE_LIMIT_RULE } from '../../common/rate-limit';
import { buildDidDocument } from '../../common/vc/did-document.util';
import { SigningKeyService } from '../../common/signing/signing-key.service';
import { InstitutionService } from './institution.service';

/**
 * Unauthenticated read-only view of the institution's Ed25519 public keys.
 *
 * A /proof bundle carries the public key it was signed with, but a verifier that
 * wants to check that key really belongs to the institution needs a second,
 * institution-published source — that is this endpoint. Deliberately separate
 * from InstitutionController, which is guarded at the class level.
 */
@ApiTags('institution')
@Controller('institution')
export class InstitutionPublicController {
  constructor(
    private readonly institutionService: InstitutionService,
    private readonly signingKeyService: SigningKeyService,
  ) {}

  @Get('public-keys')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION)
  async getPublicKeys() {
    const institution = await this.institutionService.getInstitution();
    const keys = await this.signingKeyService.listPublicKeys(institution.id);

    return {
      institution: {
        name: institution.name,
        displayName: institution.displayName,
        domain: institution.domain,
      },
      // Mapped explicitly: the admin view also carries per-key credential
      // counts, which are not public information.
      keys: keys.map((key) => ({
        keyId: key.keyId,
        publicKey: key.publicKey,
        algorithm: key.algorithm,
        active: key.active,
        createdAt: key.createdAt,
        revokedAt: key.revokedAt,
      })),
    };
  }

  /**
   * did:web document for the institution. Served here because Nest runs under a
   * global `api` prefix; apps/web re-exposes this at /.well-known/did.json,
   * which is where a did:web resolver actually looks (and the web container is
   * the only one exposed publicly — see docs/DEPLOY.md).
   */
  @Get('did.json')
  @RateLimit(RATE_LIMIT_RULE.VERIFICATION)
  @Header('Content-Type', 'application/did+json')
  // Short TTL: a key rotation has to become visible quickly.
  @Header('Cache-Control', 'public, max-age=300')
  async getDidDocument() {
    const institution = await this.institutionService.getInstitution();
    const keys = await this.signingKeyService.listPublicKeys(institution.id);

    return buildDidDocument({
      issuerDomain: institution.domain,
      institutionName: institution.displayName ?? institution.name,
      keys: keys.map((key) => ({
        keyId: key.keyId,
        publicKey: key.publicKey,
        revokedAt: key.revokedAt,
      })),
    });
  }
}
