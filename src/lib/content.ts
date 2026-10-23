import { getCollection, type CollectionEntry } from 'astro:content';
export type Article = CollectionEntry<'articles'>;
export const articleUrl = (post: Article) => `/${post.data.category}/${post.data.slug}/`;
export async function publishedArticles() {
  return (await getCollection('articles', ({data}) => !data.draft && data.publishedDate <= new Date()))
    .sort((a, b) => b.data.publishedDate.getTime() - a.data.publishedDate.getTime() || a.data.title.localeCompare(b.data.title));
}
export const readingTime = (post: Article) => Math.max(1, Math.ceil((post.body ?? '').split(/\s+/).length / 220));
export const displayDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
export const xmlEscape = (text: string) => text.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));
