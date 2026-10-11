import { describe, expect, it } from 'vitest';
import { FieldType, type FieldSchema } from '@formforge/types';
import { validateResponses } from '../src/services/submission.service.js';

const fields: FieldSchema[] = [
  { id: 'dept', type: FieldType.DROPDOWN, label: 'Department', required: true, options: [
    { label: 'Engineering', value: 'eng' }, { label: 'Product', value: 'prod' }] },
  { id: 'overall', type: FieldType.RATING, label: 'Overall', required: true },
  { id: 'hours', type: FieldType.NUMBER, label: 'Hours', required: false },
  { id: 'email', type: FieldType.EMAIL, label: 'Email', required: false }
];

const ok = { dept: 'eng', overall: '4' };

describe('validateResponses', () => {
  it('accepts a valid submission and skips empty optional fields', () => {
    expect(() => validateResponses(fields, { ...ok, hours: '', email: '' })).not.toThrow();
  });

  it('requires required fields', () => {
    expect(() => validateResponses(fields, { overall: '4' })).toThrow('"Department" is required');
  });

  it('only accepts listed dropdown options', () => {
    expect(() => validateResponses(fields, { ...ok, dept: 'hacker' })).toThrow('one of the listed options');
  });

  it('accepts ratings 1 to 5 only, as whole numbers', () => {
    expect(() => validateResponses(fields, { ...ok, overall: 5 })).not.toThrow();
    for (const bad of ['0', '6', '3.5', 'great']) {
      expect(() => validateResponses(fields, { ...ok, overall: bad })).toThrow('rating from 1 to 5');
    }
  });

  it('rejects non-numeric numbers and malformed e-mails', () => {
    expect(() => validateResponses(fields, { ...ok, hours: 'forty' })).toThrow('must be a number');
    expect(() => validateResponses(fields, { ...ok, email: 'not-an-email' })).toThrow('valid email');
  });
});
