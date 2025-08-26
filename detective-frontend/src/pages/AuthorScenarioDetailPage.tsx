// src/pages/AuthorScenarioDetailPage.tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../shared/api/client";

type ScenarioDetail = {
  id: number;
  title: string;
  content: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
};

export default function AuthorScenarioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["scenario", id],
    queryFn: async () => {
      const { data } = await api.get<ScenarioDetail>(`/scenarios/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const del = useMutation({
    mutationFn: async () => {
      await api.delete(`/scenarios/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-scenarios"] });
      nav("/author/scenarios");
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
        }}
      >
        {data.content}
      </pre>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Link to="/author/scenarios" style={{ textDecoration: "none" }}>
          ← 목록으로
        </Link>

        {canEdit && (
          <>
            <Link
              to={`/author/scenarios/${data.id}/edit`}
              style={{ marginLeft: "auto", textDecoration: "none" }}
            >
              수정
            </Link>
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
                border: "1px solid #e33",
                background: "white",
                color: "#e33",
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
