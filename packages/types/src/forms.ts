export enum FieldType {
  TEXT = 'TEXT',
  EMAIL = 'EMAIL',
  NUMBER = 'NUMBER',
  TEXTAREA = 'TEXTAREA',
  DROPDOWN = 'DROPDOWN',
  FILE = 'FILE'
}

export type FieldOption = {
  label: string;
  value: string;
};

export type FieldSchema = {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: FieldOption[];
};

export type FormConfig = {
  id: string;
  name: string;
  slug: string;
  fields: FieldSchema[];
  isActive: boolean;
};
