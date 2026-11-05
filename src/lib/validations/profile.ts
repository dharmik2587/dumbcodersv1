import { z } from 'zod';

const optionalString = (maxLen = 500) =>
  z
    .string()
    .trim()
    .max(maxLen)
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional();

const optionalUrl = z
  .union([z.string().url(), z.literal(''), z.null()])
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional();

/** Only http(s) links are allowed so a saved repo URL can never become a javascript: link. */
const httpUrl = z
  .string()
  .trim()
  .max(300)
  .url()
  .refine((value) => /^https?:\/\//i.test(value), 'Repository links must start with http:// or https://');

const repoSchema = z.object({
  name: z.string().trim().min(1).max(100),
  lang: z.string().trim().max(40),
  stars: z.number().int().min(0).max(10_000_000),
  url: httpUrl,
});

export const profileUpdateSchema = z.object({
  fullName: optionalString(100),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9][a-z0-9_-]{2,29}$/,
      'Handle must be 3-30 characters: letters, numbers, "_" or "-", starting with a letter or number.',
    )
    .optional(),
  bio: optionalString(500),
  college: optionalString(200),
  collegeName: optionalString(200),
  collegeId: z
    .union([z.string().trim(), z.literal(''), z.null()])
    .transform((val) => {
      if (!val || val === '') return null;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
      return isUuid ? val : null;
    })
    .nullable()
    .optional(),
  branch: optionalString(100),
  graduationYear: z
    .preprocess((val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      if (isNaN(num)) return null;
      // If user passed college year 1-5, map to graduation year
      if (num >= 1 && num <= 5) {
        return new Date().getFullYear() + (4 - num);
      }
      return num;
    }, z.union([z.number().int().min(1980).max(2100), z.null()]))
    .nullable()
    .optional(),
  // NOTE: no `.default([])` on the array fields below. A default would turn "field not sent"
  // into "set to empty", silently wiping a user's skills/interests on any partial update.
  skills: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
  skillLevels: z.record(z.string().trim().min(1).max(60), z.number().int().min(1).max(3)).optional(),
  rolePreference: optionalString(80),
  secondaryRoles: z.array(z.string().trim().min(1).max(40)).max(3).optional(),
  goal: z.enum(['win', 'learn', 'ship']).nullable().optional(),
  hackathonInterests: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  availability: optionalString(4000),
  customRepos: z.array(repoSchema).max(12).nullable().optional(),
  portfolioUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  onboardingDone: z.boolean().optional(),
  isOpenToTeam: z.boolean().optional(),
});

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
