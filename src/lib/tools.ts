export interface PromptFields { goal: string; context?: string; audience?: string; constraints?: string; format?: string }
export function buildPrompt(fields: PromptFields): string {
  if (!fields.goal.trim()) throw new Error('Please add your goal first.');
  const sections = [['Goal', fields.goal], ['Context', fields.context], ['Target audience', fields.audience], ['Constraints', fields.constraints], ['Output format', fields.format]];
  return sections.filter(([, value]) => value?.trim()).map(([label, value]) => `${label}\n${value!.trim()}`).join('\n\n');
}
export function checklistSummary(completed: number, total: number): string {
  return `${completed} of ${total} checks completed. ${completed === total ? 'This records your review; it does not certify accuracy.' : 'Review each item before using the response.'}`;
}
