import { MAX_CREDENTIAL_PAGE_SIZE } from './list-credentials.dto';

/**
 * Upper bound on a bulk `ids` array.
 *
 * `@ArrayNotEmpty()` guarded the wrong end: 50,000 ids passed validation and
 * were then processed one at a time, each in its own transaction. One
 * mis-pasted request was enough to saturate the database, and the ADMIN rate
 * limit does not help when a single request is the whole attack.
 *
 * The dashboard selects from one page at a time and a page is at most
 * MAX_CREDENTIAL_PAGE_SIZE rows, so five pages' worth of accumulated selection
 * is well clear of anything the UI can actually produce.
 */
export const MAX_BULK_IDS = MAX_CREDENTIAL_PAGE_SIZE * 5;

/** Ids are `crd_`/`prf_` plus 18 hex characters; this is slack around that. */
export const MAX_ID_LENGTH = 64;
