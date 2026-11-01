/** Prefer genuinely related guides rather than filling all slots with unrelated articles. */
export interface RelatedCandidate {
  id: string;
  data: {
    category: string;
    tags: string[];
    publishedDate: Date;
    title: string;
  };
}

export function relatedArticles<T extends RelatedCandidate>(
  post: T, candidates: T[], limit = 3
): T[] {
  const sourceTags = new Set(post.data.tags);
  const scored = candidates
    .filter(candidate => candidate.id !== post.id)
    .map(candidate => {
      const sharedTags = candidate.data.tags.filter(tag => sourceTags.has(tag)).length;
      const sameCategory = candidate.data.category === post.data.category;
      // Specific shared topics lead; same-category guides are a secondary route.
      const score = sharedTags * 4 + (sameCategory ? 2 : 0);
      return { candidate, score };
    })
    .filter(item => item.score > 0);
  scored.sort((a, b) =>
    b.score - a.score
    || b.candidate.data.publishedDate.getTime() - a.candidate.data.publishedDate.getTime()
    || a.candidate.data.title.localeCompare(b.candidate.data.title));
  return scored.slice(0, Math.max(0, limit)).map(item => item.candidate);
}
