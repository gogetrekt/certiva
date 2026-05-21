# Certiva

Certiva is an enterprise credential verification platform for institutions that need controlled issuance, public verification, document integrity proof, and audit-ready operational records.

The system is designed around institution-based identity. Public verification represents the issuing institution, not internal operator accounts.

## Product Scope

Certiva provides:

- Credential registry and public verification
- Institution-controlled credential issuance
- Secure document proof records with SHA-256 integrity checks
- Verification logs for relying-party activity
- Audit trail visibility for credential lifecycle events
- Administrator account management with role-based access control
- Blockchain anchoring as a secondary audit and trust layer

Certiva does not expose internal operator accounts as public credential identity. Credentials and document proofs are always presented as institution-issued records.

## Core Workflows

### Credential Registry

Institutions issue credentials into the registry with structured metadata, verification identifiers, QR payloads, and public verification links.

Verification answers whether a credential is official, active, revoked, or unavailable.

### Credential Verification

Public users can verify credentials through :

- Verification code lookup
- Public verification URL
- QR-based credential reference lookup
- PDF QR reference lookup

Credential-side PDF upload resolves the embedded registry reference. It is not treated as a hidden document integrity comparison.

### Secure Documents

Secure Documents is a separate proof surface for document authenticity.

Certiva computes a SHA-256 hash from the uploaded source document, stores proof metadata and hash records, and discards the source file. Future verification compares uploaded document hashes against stored proof records.

### Administration

Institution operators manage:

- Credential issuance
- Registry records
- Secure document proof records
- Verification logs
- Audit trail records
- Institution settings
- Administrator accounts and permissions

Internal administrator usernames are operational identities only. They do not replace institution identity in public credential output.

## System Architecture

Certiva is organized as a monorepo with separated runtime responsibilities:

- `apps/web`: operator dashboard and public verification surfaces
- `apps/api`: domain API, authentication, RBAC, registry, verification, audit, and document proof services
- `apps/worker`: background queue processing and blockchain anchoring workflows
- `packages/contracts`: credential registry contract interface and deployment artifacts
- `packages/types`: shared TypeScript domain contracts
- `packages/ui`: shared interface primitives
- `packages/config`: shared TypeScript and lint configuration

Routes and modules are separated by domain so credential authenticity, document authenticity, administration, and audit workflows remain independent.

## Security Model

Certiva uses:

- Role-based administrator access
- Institution-scoped operator permissions
- Server-side session handling
- Protected administrative API routes
- Immutable verification/audit records where applicable
- Deletion protections for accounts with activity or linked records
- Hash-only blockchain anchoring

Blockchain usage is limited to audit and integrity proof. Certiva does not place student personal data, PDFs, transcripts, emails, addresses, raw student IDs, or credential documents on-chain.

## Data Boundaries

Certiva stores credential metadata, registry references, verification logs, document proof metadata, SHA-256 hashes, and operational audit records.

Certiva does not retain uploaded source PDF files for Secure Documents proof creation.

Credential authenticity and document authenticity are separate concerns:

- Credential verification validates registry authority and credential lifecycle state.
- Secure document verification validates document hash integrity against a stored proof record.

## Operational Surfaces

The dashboard is structured around:

- Dashboard
- Registry
- Issue Credential
- Secure Documents
- Verification Logs
- Audit Trail
- Administrators
- Settings

Public surfaces are structured around:

- Credential check
- Secure document check
- Public proof result pages

## Ownership

Environment configuration, deployment configuration, database access, infrastructure access, and production secrets are controlled by the project owner only.

This repository intentionally does not provide public setup instructions.
