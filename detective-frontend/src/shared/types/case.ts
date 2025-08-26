export type Suspect = { id: string; name: string; avatar: string };
export type Question = {
  id: string; label: string;
  placeholder?: string; multiline?: boolean;
  required?: boolean; maxLength?: number;
};
export type ScenarioSummaryDTO = {
  scenarioId: string; prompt: string; suspectCount: number;
  suspects: { id: string | number; avatar: string; name?: string }[];
  resultQuestions: {
    id: string; label: string; placeholder?: string;
    multiline?: boolean; required?: boolean; maxLength?: number;
  }[];
};
