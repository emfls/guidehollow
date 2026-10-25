import { publishedArticles, articleUrl } from '../lib/content';
export async function GET() {
  const posts = (await publishedArticles()).map(post => ({ title:post.data.title, description:post.data.description, url:articleUrl(post), text:`${post.data.tags.join(' ')} ${post.body ?? ''}` }));
  posts.push({title:'AI Prompt Builder',description:'Create a structured prompt, copy it, or download it as text.',url:'/tools/ai-prompt-builder/',text:'goal context audience constraints format free tool'}, {title:'AI Response Quality Checklist',description:'Review facts, sources, freshness, privacy, and requirements.',url:'/tools/ai-response-checklist/',text:'verify review facts quality free tool'});
  return new Response(JSON.stringify(posts), {headers:{'Content-Type':'application/json;charset=utf-8'}});
}
