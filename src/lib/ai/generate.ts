import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

import { z } from 'zod';

export type RoadmapStep = {
  id: string;
  label: string;
  done: boolean;
  order: number;
};

const DEFAULT_STEPS: RoadmapStep[] = [
  { id: uuidv4(), label: 'Define MVP scope and target audience', done: false, order: 1 },
  { id: uuidv4(), label: 'Design database schema and API contracts', done: false, order: 2 },
  { id: uuidv4(), label: 'Setup project repository and CI/CD', done: false, order: 3 },
  { id: uuidv4(), label: 'Develop core backend logic', done: false, order: 4 },
  { id: uuidv4(), label: 'Build frontend UI components', done: false, order: 5 },
  { id: uuidv4(), label: 'Integrate frontend with backend APIs', done: false, order: 6 },
  { id: uuidv4(), label: 'Test and debug critical user flows', done: false, order: 7 },
  { id: uuidv4(), label: 'Prepare pitch deck and demo video', done: false, order: 8 },
];

const StepSchema = z.object({
  label: z.string().min(1),
  order: z.number().int().positive(),
});

export async function generateRoadmap(
  projectName: string,
  description: string,
  roles: string[],
  existingSteps?: Array<{ label: string; done: boolean; order: number }>
): Promise<RoadmapStep[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('No OPENAI_API_KEY provided. Falling back to default skeleton roadmap.');
    return DEFAULT_STEPS;
  }

  const openai = new OpenAI({ apiKey });
  
  let prompt = `
You are an expert technical product manager for hackathons.
I need a 5 to 10 step checklist/roadmap for a hackathon project.
Project Name: ${projectName}
Description: ${description || 'No description provided.'}
Team Roles: ${roles.join(', ') || 'Unknown'}

Provide the response purely as a JSON array of objects. Each object must have exactly two keys: "label" (string, the actionable step) and "order" (number, 1-indexed step number).
Do not include markdown blocks, just raw JSON.
`;

  if (existingSteps && existingSteps.length > 0) {
    prompt += `\n\nThe following steps are already marked done and MUST be preserved exactly as they are in your output:\n`;
    existingSteps.forEach((s) => {
      prompt += `- ${s.label} (order: ${s.order})\n`;
    });
    prompt += `Only regenerate the incomplete steps. Combine them with the done steps to form the final complete list.`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const text = response.choices[0]?.message?.content?.trim() || '[]';
    const jsonStr = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    
    // Zod validation
    const parsed = z.array(StepSchema).parse(JSON.parse(jsonStr));

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Invalid JSON format from AI');
    }

    return parsed.map((p) => {
      const isDone = existingSteps?.some((s) => s.label === p.label && s.done) ?? false;
      return {
        id: uuidv4(),
        label: p.label,
        done: isDone,
        order: p.order,
      };
    });
  } catch (err) {
    console.error('AI roadmap generation failed:', err);
    return DEFAULT_STEPS;
  }
}
