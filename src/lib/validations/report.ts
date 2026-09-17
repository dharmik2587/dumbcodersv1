import { z } from 'zod';

export const REPORT_CATEGORIES = [
  'broken_feature',
  'incorrect_data',
  'page_loading',
  'ui_design',
  'performance',
  'account',
  'other',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const reportCategoryLabels: Record<ReportCategory, string> = {
  broken_feature: 'Broken feature',
  incorrect_data: 'Incorrect data',
  page_loading: 'Page not loading',
  ui_design: 'UI / design issue',
  performance: 'Performance issue',
  account: 'Account issue',
  other: 'Other',
};

export const createReportSchema = z.object({
  category: z.enum(REPORT_CATEGORIES, {
    message: 'Please select a valid problem category.',
  }),
  description: z
    .string()
    .min(10, 'Please provide a bit more detail (at least 10 characters).')
    .max(5000, 'Description cannot exceed 5000 characters.'),
  email: z
    .string()
    .email('Please enter a valid email address.')
    .optional()
    .or(z.literal('')),
  pageUrl: z.string().max(1000).optional().or(z.literal('')),
  userAgent: z.string().max(1000).optional().or(z.literal('')),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
