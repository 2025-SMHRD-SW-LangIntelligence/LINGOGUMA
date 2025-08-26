import { z } from "zod";
import type { ScenarioSummaryDTO, Suspect, Question } from "../types/case";

const dtoSchema = z
  .object({
    scenarioId: z.string(),
    prompt: z.string(),
    suspectCount: z.number().int().positive(),
    suspects: z
      .array(
        z.object({
          id: z.union([z.string(), z.number()]),
          avatar: z.string(),
          name: z.string().optional(),
        })
      )
      .min(1),
    resultQuestions: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          placeholder: z.string().optional(),
          multiline: z.boolean().optional(),
          required: z.boolean().optional(),
          maxLength: z.number().int().positive().optional(),
        })
      )
      .min(1),
  })
  .superRefine((d, ctx) => {
    if (d.suspectCount !== d.suspects.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["suspectCount"],
        message: "suspectCount는 suspects 길이와 같아야 합니다.",
      });
    }
  });

export function adaptScenarioSummary(raw: unknown): {
  prompt: string;
  suspects: Suspect[];
  questions: Question[];
} {
  const dto = dtoSchema.parse(raw) as ScenarioSummaryDTO;
  const suspects: Suspect[] = dto.suspects.map((s, i) => ({
    id: String(s.id),
    name: s.name ?? `용의자${i + 1}`,
    avatar: s.avatar,
  }));
  const questions: Question[] = dto.resultQuestions.map((q) => ({
    id: q.id,
    label: q.label,
    placeholder: q.placeholder,
    multiline: q.multiline,
    required: q.required,
    maxLength: q.maxLength,
  }));
  return { prompt: dto.prompt, suspects, questions };
}
