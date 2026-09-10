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

export const profileUpdateSchema = z.object({
  fullName: optionalString(100),
  bio: optionalString(500),
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
    .preprocess(
      (val) => (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val)) ? null : val),
      z.union([z.number().int().min(1980).max(2100), z.null()])
    )
    .nullable()
    .optional(),
  skills: z.array(z.string().trim().min(1).max(50)).max(30).optional().default([]),
  rolePreference: optionalString(80),
  hackathonInterests: z.array(z.string().trim().min(1).max(80)).max(20).optional().default([]),
  availability: optionalString(4000),
  portfolioUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  onboardingDone: z.boolean().optional(),
  isOpenToTeam: z.boolean().optional(),
});


export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
