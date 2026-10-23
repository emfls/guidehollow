// Editorial threshold for small archives, not a Google indexing requirement.
export const isIndexableTag = (publishedCount: number) => publishedCount >= 2;
