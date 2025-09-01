// 내 시나리오 관리 > 시나리오 (json파일)
// src/pages/author/AuthorScenarioDetailPanel.tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";

type ScenarioDetail = {
  id: number;
  title: string;
  content: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
};

interface Props {
  scenarioId: number;
  onBack: () => void;
  onEdit: (id: number) => void;
  onDeleted: () => void;
}

export default function AuthorScenarioDetailPanel({
  scenarioId,
  onBack,
  onEdit,
  onDeleted,
}: Props) {
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["scenario", scenarioId],
    queryFn: async () => {
      const { data } = await api.get<ScenarioDetail>(
        `/scenarios/${scenarioId}`
      );
      return data;
    },
    enabled: !!scenarioId,
  });

  const del = useMutation({
    mutationFn: async () => {
      await api.delete(`/scenarios/${scenarioId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-scenarios"] });
      onDeleted();
    },
  });

  if (isLoading) return <p>불러오는 중…</p>;
  if (isError)
    return <p style={{ color: "crimson" }}>{(error as any)?.message}</p>;
  if (!data) return null;

  const canEdit = data.status === "REJECTED" || data.status === "SUBMITTED";

  return (
    <div style={{ maxWidth: 720, margin: "24px auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <h2 style={{ margin: 0 }}>{data.title}</h2>
        <span style={{ fontSize: 13, color: "#666" }}>상태: {data.status}</span>
      </div>

      <div style={{ fontSize: 12, color: "#999", marginTop: 6 }}>
        생성: {new Date(data.createdAt).toLocaleString()}
        {data.updatedAt && (
          <> · 수정: {new Date(data.updatedAt).toLocaleString()}</>
        )}
      </div>

      <hr style={{ margin: "16px 0" }} />

      <pre
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          background: "#fafafa",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #eee",
          minHeight: 120,
          color: "black",
        }}
      >
        {data.content}
      </pre>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={onBack} style={{ cursor: "pointer" }}>
          ← 목록으로
        </button>

        {canEdit && (
          <>
            <button
              onClick={() => onEdit(data.id)}
              style={{
                marginLeft: "auto",
                cursor: "pointer",
                background: "#2d6cdf",
                color: "white",
                padding: "6px 10px",
                borderRadius: 6,
              }}
            >
              수정
            </button>
            <button
              onClick={() => {
                if (
                  confirm(
                    "정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                  )
                ) {
                  del.mutate();
                }
              }}
              disabled={del.isPending}
              style={{
                background: "#e33",
                color: "white",
                padding: "6px 10px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {del.isPending ? "삭제 중..." : "삭제"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
