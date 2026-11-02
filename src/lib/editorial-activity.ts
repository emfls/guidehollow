/** Pure sorting for honest homepage publication/update visibility.
 *  It never changes an article's source dates or its public URL.
 */
interface ArticleActivity {
  data: {
    title: string;
    slug: string;
    publishedDate: Date;
    updatedDate: Date;
  };
}

export function activityIsRevision(article: ArticleActivity): boolean {
  return article.data.updatedDate.getTime() > article.data.publishedDate.getTime();
}

export function latestArticleActivity<T extends ArticleActivity>(articles: readonly T[]): T[] {
  return [...articles].sort((a,b) =>
    b.data.updatedDate.getTime() - a.data.updatedDate.getTime()
    || b.data.publishedDate.getTime() - a.data.publishedDate.getTime()
    || a.data.title.localeCompare(b.data.title)
    || a.data.slug.localeCompare(b.data.slug)
  );
}
