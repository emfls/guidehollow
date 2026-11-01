export interface PriceRow {
  lineId: string;
  channel: string;
  units: number;
  unitPrice: number;
  revenue: number;
}
export interface PriceAudit {
  rows: PriceRow[];
  rowCount: number;
  units: number;
  revenue: number;
  weightedPrice: number;
  simplePriceMean: number;
  channels: { channel: string; units: number; revenue: number; weightedPrice: number | null }[];
  zeroUnitLines: string[];
  zeroPriceLines: string[];
}

/** Parse ordinary UTF-8 CSV, including quoted commas and escaped double-quotes. No file uploads. */
export function parsePriceCsv(input: string): string[][] {
  if (!input.trim()) throw new Error('Paste a CSV or load the example before calculating.');
  if (input.length > 50000) throw new Error('CSV exceeds 50,000 characters. Use a smaller, non-sensitive sample.');
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let closedQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { quoted = false; closedQuote = true; }
      else cell += ch;
    } else if (ch === '"' && !cell && !closedQuote) {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell); cell = ''; closedQuote = false;
    } else if (ch === '\n') {
      row.push(cell);
      if (row.some(value => value.trim() !== '')) rows.push(row);
      row = []; cell = ''; closedQuote = false;
    } else {
      if (closedQuote && ch.trim()) throw new Error('Unexpected characters after a quoted CSV field.');
      if (ch === '"') throw new Error('Unexpected quotation mark in CSV field.');
      cell += ch;
    }
  }
  if (quoted) throw new Error('CSV has an unclosed quotation mark.');
  row.push(cell);
  if (row.some(value => value.trim() !== '')) rows.push(row);
  return rows;
}

export function auditWeightedPriceCsv(csv: string): PriceAudit {
  const data = parsePriceCsv(csv);
  const header = data.shift()?.map(value => value.trim()) ?? [];
  const required = ['LineID', 'Channel', 'Units', 'UnitPrice'];
  if (header.length !== 4 || !required.every((name, index) => header[index] === name)) {
    throw new Error('Expected four columns in this order: LineID,Channel,Units,UnitPrice.');
  }
  if (!data.length) throw new Error('The CSV has a header but no data rows.');
  if (data.length > 500) throw new Error('This learning tool accepts at most 500 data rows.');
  const seen = new Set<string>();
  const rows: PriceRow[] = [];
  const channelTotals = new Map<string, { units: number; revenue: number }>();
  let units = 0, revenue = 0, priceSum = 0;
  for (const [index, raw] of data.entries()) {
    const rowNumber = index + 2;
    if (raw.length !== 4) throw new Error(`Row ${rowNumber}: expected 4 columns, found ${raw.length}.`);
    const [lineId, channel, rawUnits, rawPrice] = raw.map(value => value.trim());
    if (!lineId || !channel) throw new Error(`Row ${rowNumber}: LineID and Channel are required.`);
    if (seen.has(lineId)) throw new Error(`Row ${rowNumber}: duplicate LineID "${lineId}".`);
    seen.add(lineId);
    for (const [label, value] of [['Units', rawUnits], ['UnitPrice', rawPrice]] as const) {
      if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) {
        throw new Error(`Row ${rowNumber}: ${label} must be a nonnegative number; blanks are not zero.`);
      }
    }
    const lineUnits = Number(rawUnits), unitPrice = Number(rawPrice);
    if (!Number.isSafeInteger(lineUnits)) throw new Error(`Row ${rowNumber}: Units must be a safe whole number.`);
    if (!Number.isFinite(unitPrice) || !Number.isFinite(lineUnits * unitPrice)) throw new Error(`Row ${rowNumber}: price is outside the supported range.`);
    const lineRevenue = lineUnits * unitPrice;
    rows.push({ lineId, channel, units: lineUnits, unitPrice, revenue: lineRevenue });
    units += lineUnits; revenue += lineRevenue; priceSum += unitPrice;
    const subtotal = channelTotals.get(channel) ?? { units: 0, revenue: 0 };
    subtotal.units += lineUnits; subtotal.revenue += lineRevenue;
    channelTotals.set(channel, subtotal);
  }
  if (!Number.isSafeInteger(units) || !Number.isFinite(revenue) || !Number.isFinite(priceSum)) throw new Error('Totals exceed the safe numeric range.');
  if (!units) throw new Error('All quantities are zero. Revenue per sold unit is undefined.');
  return {
    rows, rowCount: rows.length, units, revenue,
    weightedPrice: revenue / units,
    simplePriceMean: priceSum / rows.length,
    channels: [...channelTotals].map(([channel, totals]) => ({
      channel, units: totals.units, revenue: totals.revenue,
      weightedPrice: totals.units ? totals.revenue / totals.units : null,
    })),
    zeroUnitLines: rows.filter(row => !row.units).map(row => row.lineId),
    zeroPriceLines: rows.filter(row => !row.unitPrice).map(row => row.lineId),
  };
}
