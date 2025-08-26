// 백엔드 엔티티/응답에 맞춘 최소 타입
export type ScenarioStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED";

export type Scenario = {
  id: number;
  title: string;
  summary: string;
  content?: string;
  status: ScenarioStatus;
  author?: { index?: number; nickname?: string; id?: string } | null;
  reviewer?: { index?: number; nickname?: string; id?: string } | null;
  rejectionReason?: string | null;
  createdAt?: string;
  submittedAt?: string;
  reviewedAt?: string;
  publishedAt?: string;
};
