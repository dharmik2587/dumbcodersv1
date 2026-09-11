import { z } from 'zod';

export const hackathonSourceSchema = z.enum([
  'unstop',
  'devfolio',
  'hack2skill',
  'devpost',
  'mlh',
  'hackerearth',
  'manual',
]);

const nullableUrl = z.union([z.string().url(), z.null()]).optional();
const nullableDate = z.union([z.string().datetime({ offset: true }), z.null()]).optional();

export const hackathonIngestItemSchema = z.object({
  source: hackathonSourceSchema,
  sourceId: z.string().trim().min(1).max(200),
  canonicalKey: z.string().trim().min(1).max(300).optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(30_000).nullable().optional(),
  organizer: z.string().max(200).nullable().optional(),
  startAt: nullableDate,
  endAt: nullableDate,
  registrationDeadlineAt: nullableDate,
  timezone: z.string().trim().min(1).max(80).default('UTC'),
  mode: z.string().trim().max(40).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  teamSizeMin: z.number().int().min(1).max(100).nullable().optional(),
  teamSizeMax: z.number().int().min(1).max(100).nullable().optional(),
  prizeAmount: z.union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.null()]).optional(),
  prizeCurrency: z.string().trim().length(3).default('INR'),
  prizeDisplay: z.string().max(200).nullable().optional(),
  themes: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  techStack: z.array(z.string().trim().min(1).max(60)).max(50).default([]),
  registrationUrl: nullableUrl,
  sourceUrl: nullableUrl,
  rawPayload: z.record(z.string(), z.unknown()).optional(),
});

export const hackathonIngestSchema = z.object({
  runId: z.string().trim().max(200).optional(),
  source: hackathonSourceSchema,
  hackathons: z.array(hackathonIngestItemSchema).min(1).max(100),
});

export const hackathonListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  source: hackathonSourceSchema.optional(),
  mode: z.string().trim().max(40).optional(),
  theme: z.string().trim().max(60).optional(),
  status: z.string().trim().max(40).default('published'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(1000).default(200),
});

export type HackathonIngestItem = z.infer<typeof hackathonIngestItemSchema>;
