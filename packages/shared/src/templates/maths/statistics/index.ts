import type { QuestionTemplate } from '../../types';
import { displayTemplates } from './displays';
import { interpretingTemplates } from './interpreting';
import { investigationTemplates } from './investigations';
import { summaryTemplates } from './summary';

// Templates for the statistics strand. Each file exports templates; list them here.
export const templates: QuestionTemplate[] = [
  ...investigationTemplates,
  ...summaryTemplates,
  ...displayTemplates,
  ...interpretingTemplates,
];
