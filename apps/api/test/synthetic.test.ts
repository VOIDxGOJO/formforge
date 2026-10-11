import { describe, expect, it } from 'vitest';
import { FieldType, type FieldSchema } from '@formforge/types';
import { decodeAnswers, personaQuestionnaire } from '../src/services/synthetic.service.js';
import { seededRandom } from '../src/engine/model.js';

const opts = (...labels: string[]) => labels.map((label, i) => ({ label, value: `option_${i + 1}` }));
const modeled: FieldSchema[] = [
  { id: 'freq', type: FieldType.DROPDOWN, label: 'How often did you meet your mentor?', required: false, options: opts('Never', 'Monthly', 'Weekly', 'Daily') },
  { id: 'overall', type: FieldType.RATING, label: 'Overall, how satisfied were you?', required: true }
];

describe('personaQuestionnaire', () => {
  it('shows each persona the dropdown options in its own random order, labelled with letters', () => {
    const random = seededRandom(11);
    const orders = Array.from({ length: 8 }, () =>
      (personaQuestionnaire(modeled, random).questions[0] as { options: string[] }).options.map((o) => o.slice(3)).join(',')
    );
    expect(new Set(orders).size).toBeGreaterThan(1);
    const { questions } = personaQuestionnaire(modeled, seededRandom(1));
    expect((questions[0] as { options: string[] }).options.every((o, i) => o.startsWith(`${'ABCD'[i]}) `))).toBe(true);
    expect(questions[1]).toEqual({ questionId: 'overall', text: 'Overall, how satisfied were you?', scale: '1-5' });
  });

  it('maps every letter back to the right option value', () => {
    const { questions, mapping } = personaQuestionnaire(modeled, seededRandom(5));
    const shown = (questions[0] as { options: string[] }).options;
    for (const line of shown) {
      const letter = line[0]!;
      const label = line.slice(3);
      const expected = modeled[0]!.options!.find((o) => o.label === label)!.value;
      expect(decodeAnswers(modeled, mapping, [{ questionId: 'freq', choice: letter }])).toEqual({ freq: expected });
    }
  });
});

describe('decodeAnswers', () => {
  const { mapping } = personaQuestionnaire(modeled, seededRandom(2));

  it('accepts "B", "b" and "B)" and ratings 1-5', () => {
    expect(decodeAnswers(modeled, mapping, [{ questionId: 'freq', choice: 'b)' }, { questionId: 'overall', choice: '4' }])).toEqual({
      freq: mapping.get('freq')!.get('B'),
      overall: '4'
    });
  });

  it('accepts "B) Weekly" style answers and plain option labels', () => {
    const letterFor = (value: string) => [...mapping.get('freq')!].find(([, v]) => v === value)![0];
    const weekly = `${letterFor('option_3')}) Weekly`;
    expect(decodeAnswers(modeled, mapping, [{ questionId: 'freq', choice: weekly }])).toEqual({ freq: 'option_3' });
    expect(decodeAnswers(modeled, mapping, [{ questionId: 'freq', choice: 'daily' }])).toEqual({ freq: 'option_4' });
    expect(decodeAnswers(modeled, mapping, [{ questionId: 'overall', choice: '4 (satisfied)' }])).toEqual({ overall: '4' });
  });

  it('accepts the question text when the model echoes it instead of the id', () => {
    expect(decodeAnswers(modeled, mapping, [{ questionId: 'Overall, how satisfied were you?', choice: '2' }])).toEqual({ overall: '2' });
  });

  it('drops answers that do not fit the question', () => {
    expect(
      decodeAnswers(modeled, mapping, [
        { questionId: 'freq', choice: 'Z' },
        { questionId: 'overall', choice: '7' },
        { questionId: 'overall', choice: '3.5' },
        { questionId: 'unknown', choice: 'A' }
      ])
    ).toEqual({});
  });
});
