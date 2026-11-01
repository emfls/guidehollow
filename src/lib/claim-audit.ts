export type ClaimVerdict = 'SUPPORTED' | 'CONTRADICTED' | 'UNSUPPORTED';
export interface ClaimCase {
  id: string;
  scenario: 'GARDEN' | 'RELEASE' | 'EVENT';
  claim: string;
  expected: ClaimVerdict;
  reason: string;
}
export type ClaimAnswer = ClaimVerdict | '';
export const VERDICTS: ClaimVerdict[] = ['SUPPORTED', 'CONTRADICTED', 'UNSUPPORTED'];
export const PRACTICE_IDS = ['G04', 'G06', 'G09', 'R02', 'E06'] as const;

/**
 * The controlled public fixture contains no commas or quoted fields.
 * Reject incompatible CSV rather than silently mislabeling a claim.
 * Never interpret an imported label as a real AI service's performance.
 */
export function parseClaimCases(csv: string): ClaimCase[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.shift()?.replace(/^\uFEFF/, '') !== 'CaseID,Scenario,Claim,ExpectedVerdict,EditorialReason') {
    throw new Error('The source exercise has an unexpected header.');
  }
  const cases: ClaimCase[] = [];
  const ids = new Set<string>();
  for (const line of lines) {
    const fields = line.split(',');
    if (fields.length !== 5) throw new Error('The source exercise has an invalid row.');
    const [id, scenario, claim, expected, reason] = fields;
    if (!/^[GRE]\d{2}$/.test(id) || ids.has(id)) throw new Error('The source exercise contains an invalid or duplicate case.');
    if (!['GARDEN', 'RELEASE', 'EVENT'].includes(scenario) || !VERDICTS.includes(expected as ClaimVerdict)) {
      throw new Error('The source exercise contains an invalid category or verdict.');
    }
    if (!claim?.trim() || !reason?.trim()) throw new Error('The source exercise contains an incomplete claim.');
    ids.add(id);
    cases.push({id, scenario:scenario as ClaimCase['scenario'], claim, expected:expected as ClaimVerdict, reason});
  }
  if (cases.length !== 22 || PRACTICE_IDS.some(id => !ids.has(id))) {
    throw new Error('The source exercise must contain all 22 published cases.');
  }
  return cases;
}
export function scoreClaimCases(cases: ClaimCase[], answers: Record<string, ClaimAnswer>) {
  const results = cases.map(item => ({
    ...item,
    chosen: answers[item.id] || '',
    matches: answers[item.id] === item.expected,
  }));
  const answered = results.filter(item => item.chosen !== '').length;
  const matched = results.filter(item => item.matches).length;
  return {answered, matched, total: results.length, results};
}
