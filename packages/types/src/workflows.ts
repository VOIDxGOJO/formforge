export enum ActionType {
  SEND_EMAIL = 'SEND_EMAIL',
  WEBHOOK = 'WEBHOOK'
}

export type EmailActionConfig = {
  to: string;
  subject: string;
  body: string;
};

export type WebhookActionConfig = {
  url: string;
  description?: string;
};

export type WorkflowStep = {
  id: string;
  actionType: ActionType;
  actionConfig: EmailActionConfig | WebhookActionConfig;
  order: number;
};

export type WorkflowConfig = {
  id: string;
  formId: string;
  name: string;
  isActive: boolean;
  steps: WorkflowStep[];
};

export type TriggerCondition = {
  fieldId?: string;
  operator?: 'equals' | 'contains';
  value?: string;
};
