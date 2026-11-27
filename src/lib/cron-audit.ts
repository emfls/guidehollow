export type CronDayRule = 'posix' | 'and';
export type CronSunday = 'zero' | 'zero-or-seven';

export interface CronAuditOptions {
  reference: string;
  dayRule: CronDayRule;
  sunday: CronSunday;
  timeZone: string;
}

interface CronField {
  values: Set<number>;
  unrestricted: boolean;
}

interface CronSchedule {
  minute: CronField;
  hour: CronField;
  day: CronField;
  month: CronField;
  weekday: CronField;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const TARGET_RUNS = 10;
export const CRON_SEARCH_YEARS = 50;

function parseField(token: string, name: string, min: number, max: number): CronField {
  const values = new Set<number>();
  for (const term of token.split(',')) {
    const match = /^(\*|([0-9]+)(?:-([0-9]+))?)(?:\/([0-9]+))?$/.exec(term);
    if (!match || (token.includes(',') && match[1] === '*')) {
      throw new Error(`${name} field must use numbers, lists, ranges or a wildcard.`);
    }
    const [, base, first, last, stride] = match;
    const start = base === '*' ? min : Number(first);
    const end = base === '*' ? max : last === undefined ? start : Number(last);
    if (name === 'Day of week' && max === 6 && (start === 7 || end === 7)) {
      throw new Error('Day of week field uses 0 for Sunday in this mode. Select the 0 or 7 mode to accept 7.');
    }
    if (start < min || end > max || start > end) {
      throw new Error(`${name} field must be between ${min} and ${max} in ascending order.`);
    }
    const step = stride === undefined ? 1 : Number(stride);
    if (!Number.isSafeInteger(step) || step < 1 || (stride !== undefined && base !== '*' && last === undefined)) {
      throw new Error(`${name} field steps need a wildcard or range and a positive integer step.`);
    }
    for (let value = start; value <= end; value += step) values.add(value);
  }
  return { values, unrestricted: token === '*' };
}

export function parseCronReference(value: string): Date {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?Z$/.exec(value.trim());
  if (!match) throw new Error('Enter a UTC reference such as 2028-05-01T00:00:00Z.');
  const expected = `${match[1]}:${match[2] ?? '00'}.${(match[3] ?? '').padEnd(3, '0')}Z`;
  const date = new Date(expected);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== expected) {
    throw new Error('The UTC reference must be a real calendar date and time.');
  }
  if (date.getUTCFullYear() < 1970 || date.getUTCFullYear() > 9998 - CRON_SEARCH_YEARS) {
    throw new Error(`The UTC reference year must be between 1970 and ${9998 - CRON_SEARCH_YEARS}.`);
  }
  return date;
}

function matchesDate(date: Date, schedule: CronSchedule, dayRule: CronDayRule): boolean {
  const { day, month, weekday } = schedule;
  const dateMatches = day.values.has(date.getUTCDate());
  const monthMatches = month.values.has(date.getUTCMonth() + 1);
  const weekdayMatches = weekday.values.has(date.getUTCDay());
  if (dayRule === 'and' || weekday.unrestricted) return monthMatches && dateMatches && weekdayMatches;
  if (month.unrestricted && day.unrestricted) return weekdayMatches;
  return (monthMatches && dateMatches) || weekdayMatches;
}

function zoneOffsets(timeZone: string): (stamp: number) => number {
  if (timeZone === 'UTC') return () => 0;
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' });
  } catch {
    throw new Error('Enter a time zone such as America/New_York or Europe/London.');
  }
  return stamp => {
    const label = format.formatToParts(stamp).find(part => part.type === 'timeZoneName')?.value;
    if (label === 'GMT') return 0;
    const match = /^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(label ?? '');
    if (!match) throw new Error('This browser could not read the selected time zone offset.');
    const [, sign, hours, minutes, seconds = '0'] = match;
    return (sign === '-' ? -1 : 1) * (Number(hours) * HOUR + Number(minutes) * MINUTE + Number(seconds) * 1000);
  };
}

function* wallTimes(start: number, end: number, schedule: CronSchedule, dayRule: CronDayRule) {
  const hours = [...schedule.hour.values].sort((a, b) => a - b);
  const minutes = [...schedule.minute.values].sort((a, b) => a - b);
  for (let day = Math.floor(start / DAY) * DAY; day < end; day += DAY) {
    if (!matchesDate(new Date(day), schedule, dayRule)) continue;
    for (const hour of hours) {
      for (const minute of minutes) {
        const wallTime = day + hour * HOUR + minute * MINUTE;
        if (wallTime >= start && wallTime < end) yield wallTime;
      }
    }
  }
}

interface RunInstant { stamp: number; offset: number }

function nextRuns(
  schedule: CronSchedule, dayRule: CronDayRule, reference: Date, until: number,
  offsetAt: (stamp: number) => number,
): RunInstant[] {
  const runs: RunInstant[] = [];
  const after = reference.getTime() + 1;
  let offset = offsetAt(after);
  for (let start = after; start < until && runs.length < TARGET_RUNS;) {
    const end = Math.min((Math.floor(start / DAY) + 1) * DAY, until);
    const endOffset = offsetAt(end);
    const offsets = offset === endOffset ? [offset] : [offset, endOffset];
    const batch: RunInstant[] = [];
    for (const candidateOffset of offsets) {
      let accepted = 0;
      for (const time of wallTimes(start + candidateOffset, end + candidateOffset, schedule, dayRule)) {
        const stamp = time - candidateOffset;
        // On an offset-transition day, round-trip candidates to skip gaps and keep both sides of folds.
        if (offsets.length > 1 && offsetAt(stamp) !== candidateOffset) continue;
        batch.push({ stamp, offset: candidateOffset });
        if (++accepted === TARGET_RUNS - runs.length) break;
      }
    }
    batch.sort((a, b) => a.stamp - b.stamp);
    runs.push(...batch.slice(0, TARGET_RUNS - runs.length));
    start = end;
    offset = endOffset;
  }
  return runs;
}

function iso(stamp: number): string {
  return new Date(stamp).toISOString().replace('.000Z', 'Z');
}

function offsetLabel(offset: number): string {
  const absolute = Math.abs(offset);
  const hours = String(Math.floor(absolute / HOUR)).padStart(2, '0');
  const minutes = String(Math.floor(absolute % HOUR / MINUTE)).padStart(2, '0');
  const seconds = absolute % MINUTE / 1000;
  const tail = seconds ? `:${String(seconds).padStart(2, '0')}` : '';
  return `${offset < 0 ? '-' : '+'}${hours}:${minutes}${tail}`;
}

type WarningCode = 'day-rule' | 'sunday-alias' | 'step-syntax' | 'utc-comparison' | 'offset-change' | 'search-limit';

function firstDifference(runs: RunInstant[], other: RunInstant[]): string | undefined {
  const row = Array.from({ length: Math.max(runs.length, other.length) }, (_, index) => index)
    .find(index => runs[index]?.stamp !== other[index]?.stamp);
  if (row === undefined) return undefined;
  const describe = (run?: RunInstant) => run ? iso(run.stamp) : 'no match within the search window';
  return `Run ${row + 1} is ${describe(runs[row])} with your settings and ${describe(other[row])} under the comparison.`;
}

export function auditCron(expression: string, options: CronAuditOptions) {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error('Enter exactly five fields (minute, hour, day of month, month, day of week). Remove command text, seconds or year fields.');
  }
  if (expression.length > 1024) throw new Error('Keep the five fields within 1,024 characters.');
  const [minute, hour, day, month, weekday] = fields;
  const schedule: CronSchedule = {
    minute: parseField(minute, 'Minute', 0, 59),
    hour: parseField(hour, 'Hour', 0, 23),
    day: parseField(day, 'Day of month', 1, 31),
    month: parseField(month, 'Month', 1, 12),
    weekday: parseField(weekday, 'Day of week', 0, options.sunday === 'zero' ? 6 : 7),
  };
  const warnings: { code: WarningCode; message: string }[] = [];
  if (schedule.weekday.values.delete(7)) schedule.weekday.values.add(0);
  if (weekday.split(',').some(term => term.split('/')[0].split('-').some(value => Number(value) === 7))) {
    warnings.push({ code: 'sunday-alias', message: 'This mode maps 7 to Sunday. An engine limited to weekdays 0–6 rejects that value.' });
  }
  if (expression.includes('/')) {
    warnings.push({ code: 'step-syntax', message: 'Slash steps are an extension to POSIX syntax. Expand them into numeric lists for strict POSIX portability.' });
  }

  const reference = parseCronReference(options.reference);
  const horizon = new Date(reference);
  horizon.setUTCFullYear(reference.getUTCFullYear() + CRON_SEARCH_YEARS);
  const until = horizon.getTime();
  const offsetAt = zoneOffsets(options.timeZone);
  const runs = nextRuns(schedule, options.dayRule, reference, until, offsetAt);

  if (!schedule.weekday.unrestricted && (!schedule.day.unrestricted || !schedule.month.unrestricted)) {
    const alternative = options.dayRule === 'posix' ? 'and' : 'posix';
    const other = nextRuns(schedule, alternative, reference, until, offsetAt);
    const comparison = alternative === 'posix' ? 'POSIX OR' : 'Strict AND';
    const difference = firstDifference(runs, other) ?? 'The preview lists agree within the search window.';
    warnings.push({ code: 'day-rule', message: `Compare with ${comparison}. ${difference}` });
  }
  if (options.timeZone !== 'UTC') {
    const other = nextRuns(schedule, options.dayRule, reference, until, () => 0);
    const difference = firstDifference(runs, other);
    if (difference) warnings.push({ code: 'utc-comparison', message: `Compare with UTC evaluation. ${difference}` });
    if (new Set([offsetAt(reference.getTime()), ...runs.map(run => run.offset)]).size > 1) {
      warnings.push({ code: 'offset-change', message: 'The UTC offset changes between the reference and listed runs. Check the offset on each timestamp.' });
    }
  }
  if (runs.length < TARGET_RUNS) {
    warnings.push({ code: 'search-limit', message: `Found ${runs.length} of ${TARGET_RUNS} runs before ${iso(until)}, the ${CRON_SEARCH_YEARS}-year search limit.` });
  }
  return {
    runs: runs.map(({ stamp, offset }) => ({
      utc: iso(stamp),
      local: offset === 0 ? iso(stamp) : iso(stamp + offset).replace('Z', offsetLabel(offset)),
    })),
    warnings,
  };
}
