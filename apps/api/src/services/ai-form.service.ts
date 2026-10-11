import { FieldType, type FieldSchema } from '@formforge/types';
import { getAIProvider } from '../lib/ai/index.js';
import { FORM_GENERATION_SYSTEM, formGenerationUserPrompt } from '../lib/ai/prompts.js';
import {
  buildGeneratedFormSchema,
  type GeneratedForm,
  type GenerateFormRequest
} from '../schemas/ai-form.schema.js';

export type FormDraft = {
  name: string;
  description: string | null;
  objective: string;
  fields: FieldSchema[];
};

const WITH_PLACEHOLDER = new Set(['TEXT', 'NUMBER', 'EMAIL', 'TEXTAREA']);

/** Turns validated model output into builder fields. Pure, so it is unit tested directly. */
export const toFormDraft = (generated: GeneratedForm, request: GenerateFormRequest): FormDraft => {
  const used = new Set<string>();
  const fields = generated.questions.map((q): FieldSchema => {
    let id = q.informationTarget;
    for (let n = 2; used.has(id); n++) id = `${q.informationTarget}_${n}`;
    used.add(id);
    const type = FieldType[q.type];
    return {
      id,
      type,
      label: q.label.trim(),
      required: q.required,
      ...(q.placeholder && WITH_PLACEHOLDER.has(q.type) ? { placeholder: q.placeholder.trim() } : {}),
      ...(type === FieldType.DROPDOWN && q.options
        ? { options: q.options.map((label, i) => ({ label: label.trim(), value: `option_${i + 1}` })) }
        : {}),
      objective: q.objective.trim(),
      informationTarget: q.informationTarget,
      estimatedSeconds: q.estimatedSeconds,
      relevance: Math.round(q.relevance * 100) / 100,
      adaptive: !q.required
    };
  });
  return {
    name: generated.title.trim(),
    description: generated.description?.trim() || null,
    objective: request.objective?.trim() || generated.objectives.join('; '),
    fields
  };
};

export const aiFormService = {
  /** Returns a draft only. Nothing is written to the database; the creator saves it from the builder. */
  generate: async (request: GenerateFormRequest): Promise<FormDraft> => {
    const generated = await getAIProvider().generateStructured(buildGeneratedFormSchema(request.questionCount), {
      name: 'generated_form',
      system: FORM_GENERATION_SYSTEM,
      user: formGenerationUserPrompt(request),
      temperature: 0.3
    });
    return toFormDraft(generated, request);
  }
};
