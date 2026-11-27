export interface PromptFields { goal: string; context?: string; audience?: string; constraints?: string; format?: string }
export function buildPrompt(fields: PromptFields): string {
  if (!fields.goal.trim()) throw new Error('Please add your goal first.');
  const sections = [['Goal', fields.goal], ['Context', fields.context], ['Target audience', fields.audience], ['Constraints', fields.constraints], ['Output format', fields.format]];
  return sections.filter(([, value]) => value?.trim()).map(([label, value]) => `${label}\n${value!.trim()}`).join('\n\n');
}
export function checklistSummary(completed: number, total: number): string {
  return `${completed} of ${total} checks completed. ${completed === total ? 'This records your review; it does not certify accuracy.' : 'Review each item before using the response.'}`;
}

export const cronTool = {
  title: 'Cron Schedule Verifier',
  description: 'Preview 10 five-field cron runs and compare day matching, Sunday numbering, and timezone offsets in your browser.',
  url: '/tools/cron-schedule-verifier/',
  text: 'cron crontab scheduler next run POSIX OR strict AND day of month weekday Sunday UTC DST timezone',
};

export const browserTools = [
  { title: 'AI Prompt Builder', description: 'Create a structured prompt, copy it, or download it as text.', url: '/tools/ai-prompt-builder/', text: 'goal context audience constraints format free tool' },
  { title: 'AI Response Quality Checklist', description: 'Review facts, sources, freshness, privacy, and requirements.', url: '/tools/ai-response-checklist/', text: 'verify review facts quality free tool' },
  { title: 'Weighted Average Audit Workbench', description: 'Independently calculate sales-weighted averages, reconcile channels, and validate CSV inputs.', url: '/tools/weighted-price-checker/', text: 'csv sample spreadsheet audit weighted average units price revenue validation' },
  { title: 'Source Claim Verifier', description: 'Practice 22 source checks, then record and export your own human-reviewed claim evidence ledger as TSV.', url: '/tools/claim-checker/', text: 'source verification claim evidence contradiction unknown quiz original 22 cases educational tool export custom manual ledger TSV' },
  cronTool,
];
