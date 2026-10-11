import { describe, expect, it } from 'vitest';
import { escapeCsvField, toCsv } from '../src/lib/csv.js';

describe('RFC 4180 CSV writer', () => {
  it('quotes every field and keeps commas inside one column', () => {
    expect(toCsv([['submittedAt', 'Overall, how satisfied were you?']])).toBe(
      '"submittedAt","Overall, how satisfied were you?"\r\n'
    );
  });

  it('doubles embedded quotes and keeps line breaks inside the field', () => {
    expect(escapeCsvField('He said "fine"\nthen left')).toBe('"He said ""fine""\nthen left"');
  });

  it('writes empty strings for missing values', () => {
    expect(toCsv([[undefined, null, '']])).toBe('"","",""\r\n');
  });

  it('formats dates, arrays and objects readably', () => {
    expect(escapeCsvField(new Date('2026-10-09T03:00:00Z'))).toBe('"2026-10-09T03:00:00.000Z"');
    expect(escapeCsvField(['aws', 'gcp'])).toBe('"aws; gcp"');
    expect(escapeCsvField({ a: 1 })).toBe('"{""a"":1}"');
  });

  it('neutralises spreadsheet formulas', () => {
    expect(escapeCsvField('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(escapeCsvField('+91 98765 43210')).toBe('"\'+91 98765 43210"');
    expect(escapeCsvField(-5)).toBe('"\'-5"');
  });
});
