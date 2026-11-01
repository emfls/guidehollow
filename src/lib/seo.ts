// Tag archives are navigation-only lists with no independent editorial material.
// Keep them crawlable and useful to people, but exclude them from Google's index
// until each archive contains substantial unique explanatory content.
export const isIndexableTag = (_publishedCount: number) => false;
