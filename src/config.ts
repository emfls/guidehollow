export const site = {
  name: 'GuideHollow',
  url: 'https://guidehollow.com',
  tagline: 'A clearer path through AI.',
  description: 'Practical AI guides, reusable prompts, and free tools. Understand the basics, build better workflows, and check what AI gets wrong.',
  repository: 'https://github.com/emfls/guidehollow',
  contact: 'https://github.com/emfls/guidehollow/issues/new',
  verification: { google: '', bing: '' },
  ads: {
    publisherId: '',
    // Keep ad requests off until a certified CMP and the updated privacy notice are live.
    servingEnabled: false,
    consentReady: false,
  },
};

export const categories = [
  { slug: 'guides', name: 'Guides', command: 'learn', description: 'Clear explanations and practical workflows, from your first AI conversation to everyday productivity.', label: 'Understand & apply' },
  { slug: 'ai-tools', name: 'AI Tool Guides', command: 'explore', description: 'Get oriented in AI tools with careful walkthroughs and realistic expectations.', label: 'Know your tools' },
  { slug: 'prompts', name: 'Prompt Library', command: 'prompt', description: 'Adaptable prompts and methods that make your instructions clearer and your results easier to review.', label: 'Ask with intention' },
  { slug: 'troubleshooting', name: 'Troubleshooting', command: 'debug', description: 'Diagnose unreliable answers, missing context, and common AI workflow problems.', label: 'Find a way forward' },
  { slug: 'tools', name: 'Free Tools', command: 'build', description: 'Small, useful tools that run in your browser. No account, AI calls, or uploads required.', label: 'Put it into practice' },
] as const;

export function validPublisherId(value: string) { return /^ca-pub-\d{16}$/.test(value); }
if (site.ads.publisherId && !validPublisherId(site.ads.publisherId)) throw new Error('Invalid AdSense Publisher ID');
if (site.ads.servingEnabled && (!site.ads.consentReady || !site.ads.publisherId)) throw new Error('Ads require a publisher ID and a completed consent setup');
