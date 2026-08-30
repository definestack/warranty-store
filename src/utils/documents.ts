/**
 * The most documents one kind may hold. The limit is counted per kind, not per item, so
 * an item may carry this many invoice documents *and* this many warranty documents at
 * the same time.
 *
 * It lives here rather than alongside the picker so the repository can enforce it when
 * reclassifying a document without `db/` reaching into `services/`.
 */
export const MAX_DOCUMENTS_PER_KIND = 10;
