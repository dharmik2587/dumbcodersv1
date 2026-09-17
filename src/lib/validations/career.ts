import { z } from 'zod';

export const CAREER_ROLES = [
  'frontend',
  'backend',
  'ai_ml',
  'data_scraping',
  'design',
  'campus_rep',
  'technical_writer',
  'qa_testing',
  'other',
] as const;

export type CareerRole = (typeof CAREER_ROLES)[number];

export const careerRoleLabels: Record<CareerRole, string> = {
  frontend: 'Frontend Engineer',
  backend: 'Backend Engineer',
  ai_ml: 'AI / ML Contributor',
  data_scraping: 'Data / Scraping Engineer',
  design: 'UI / UX Designer',
  campus_rep: 'Campus Representative',
  technical_writer: 'Technical Writer',
  qa_testing: 'QA / Testing Contributor',
  other: 'Open Source Contributor',
};

const optionalUrl = z
  .string()
  .trim()
  .refine(
    (val) => !val || /^https?:\/\/.+/i.test(val) || val.startsWith('github.com') || val.startsWith('linkedin.com'),
    { message: 'Please provide a valid URL (starting with http:// or https://).' }
  )
  .optional()
  .or(z.literal(''));

export const createCareerApplicationSchema = z.object({
  name: z.string().min(2, 'Please provide your name (at least 2 characters).').max(100),
  email: z.string().email('Please enter a valid email address.'),
  role: z.string().min(2, 'Please select or specify a role.'),
  portfolioUrl: optionalUrl,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  resumeUrl: optionalUrl,
  message: z
    .string()
    .min(15, 'Please tell us a bit about why you would like to contribute (at least 15 characters).')
    .max(5000),
});

export type CreateCareerApplicationInput = z.infer<typeof createCareerApplicationSchema>;
