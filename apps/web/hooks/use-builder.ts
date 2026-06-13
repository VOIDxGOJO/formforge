import { useBuilderStore } from '@/store/builder-store';
import { FieldType, type FieldSchema } from '@formforge/types';

export const useBuilder = () => {
  const store = useBuilderStore();
  const addField = (type: FieldType) => {
    const field: FieldSchema = {
      id: crypto.randomUUID(),
      type,
      label: `${type} field`,
      required: false,
      ...(type === FieldType.DROPDOWN
        ? { options: [{ label: 'Option 1', value: 'option_1' }] }
        : {})
    };
    store.addField(field);
    store.selectField(field.id);
  };
  return { ...store, addField };
};
