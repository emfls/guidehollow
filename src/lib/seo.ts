// Tag archives are navigation-only lists with no independent editorial material.
// Keep them crawlable and useful to people, but exclude them from Google's index
// until each archive contains substantial unique explanatory content.
export const isIndexableTag = (_publishedCount: number) => false;

// The public topic index should only exist when it helps readers compare
// multiple substantive guides. Single-article lists are not useful archives.
export const isUsefulTagArchive = (publishedCount: number) => publishedCount >= 3;
