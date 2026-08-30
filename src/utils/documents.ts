/**
 * The most documents one section may hold. The limit is counted per kind *per scope* —
 * not per item — where a scope is either the item itself or one of its extended
 * warranties. So an item may carry this many invoice documents and this many warranty
 * documents of its own, plus this many of each for every extended warranty it holds, all
 * at the same time. Filling one section never restricts another.
 *
 * It lives here rather than alongside the picker so the repository can enforce it without
 * `db/` reaching into `services/`.
 */
export const MAX_DOCUMENTS_PER_KIND = 10;
