// RFC 4180 CSV writer: every field quoted, embedded quotes doubled, CRLF line endings.
// Values starting with = + - @ (or tab/CR) are prefixed with ' so spreadsheet apps
// do not evaluate them as formulas (OWASP CSV injection).

const FORMULA_START = /^[=+\-@\t\r]/;

export const formatCsvValue = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map(formatCsvValue).join('; ');
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const escapeCsvField = (value: unknown): string => {
  let text = formatCsvValue(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export const toCsv = (rows: unknown[][]): string =>
  rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n') + '\r\n';
