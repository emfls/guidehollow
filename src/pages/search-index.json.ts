import { publishedArticles, articleUrl } from '../lib/content';
import { browserTools } from '../lib/tools';
export async function GET() {
  const posts = (await publishedArticles()).map(post => ({ title:post.data.title, description:post.data.description, url:articleUrl(post), text:`${post.data.tags.join(' ')} ${post.body ?? ''}` }));
  posts.push(...browserTools);
  return new Response(JSON.stringify(posts), {headers:{'Content-Type':'application/json;charset=utf-8'}});
}
