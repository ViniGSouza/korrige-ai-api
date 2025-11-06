import { z } from 'zod';

const competencySchema = z.object({
  score: z.number().min(0).max(200).describe('Score between 0-200 points'),
  feedback: z.string().describe('Detailed feedback in Brazilian Portuguese'),
  strengths: z.array(z.string()).describe('List of strengths identified'),
  improvements: z.array(z.string()).describe('List of points to improve'),
});

export const essayCorrectionSchema = z.object({
  competency1: competencySchema.describe('Competency 1: Formal written language mastery'),
  competency2: competencySchema.describe('Competency 2: Theme comprehension and development'),
  competency3: competencySchema.describe('Competency 3: Information organization and argumentation'),
  competency4: competencySchema.describe('Competency 4: Linguistic mechanisms for argumentation'),
  competency5: competencySchema.describe('Competency 5: Intervention proposal'),
  totalScore: z.number().min(0).max(1000).describe('Sum of all 5 competencies (0-1000)'),
  overallFeedback: z.string().describe('Overall feedback about the essay in Brazilian Portuguese'),
});

export type EssayCorrectionSchema = z.infer<typeof essayCorrectionSchema>;
