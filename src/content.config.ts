import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string().min(10), description: z.string().min(50).max(200),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    category: z.enum(['guides', 'ai-tools', 'prompts', 'troubleshooting']),
    tags: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).min(1),
    publishedDate: z.coerce.date(), updatedDate: z.coerce.date(),
    sources: z.array(z.object({ title: z.string(), url: z.url().startsWith('https://') })).min(1),
    draft: z.boolean(), author: z.string(), featured: z.boolean().default(false),
  }).refine(data => data.updatedDate >= data.publishedDate, { message: 'Updated date cannot precede publication' }),
});
export const collections = { articles };
