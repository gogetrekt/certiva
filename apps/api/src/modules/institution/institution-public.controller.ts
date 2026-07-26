import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { RateLimit, RATE_LIMIT_RULE } from '../../common/rate-limit';
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
}
