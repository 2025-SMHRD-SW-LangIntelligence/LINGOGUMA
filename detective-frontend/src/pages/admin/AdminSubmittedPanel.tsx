// 신규
// src/features/admin/AdminSubmittedPanel.tsx
import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import "./admin-panel.css";

type Item = {
  id: number;
  title: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "DRAFT" | "REVIEWING";
  authorIndex: number;
  authorId: string;
  authorEmail: string;
  submittedAt?: string | null;
  createdAt: string;
};

type Detail = {
  id: number;
  title: string;
  content: string;
  status: "SUBMITTED" | "REVIEWING" | "APPROVED" | "REJECTED" | "DRAFT";
  authorIndex: number;
  authorId: string;
  authorEmail: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
};

export default function AdminSubmittedPanel() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // 목록 조회
  const {
    data: list,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-submitted"],
    queryFn: async () => {
      const { data } = await api.get<Item[]>("/admin/scenarios/submitted");
      return data;
    },
    placeholderData: keepPreviousData,
  });

  // 단건 상세 조회
  const { data: detail, isFetching: isDetailFetching } = useQuery({
    queryKey: ["admin-submitted-detail", selectedId],
    queryFn: async () => {
      const { data } = await api.get<Detail>(`/admin/scenarios/${selectedId}`);
      return data;
    },
    enabled: selectedId != null,
  });

  // 액션들
  const review = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/admin/scenarios/${id}/review`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-submitted"] });
      if (selectedId)
        qc.invalidateQueries({
          queryKey: ["admin-submitted-detail", selectedId],
        });
    },
  });

  const approve = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/admin/scenarios/${id}/approve`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-submitted"] });
      setSelectedId(null);
    },
  });

  const reject = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await api.post(`/admin/scenarios/${id}/reject`, { reason });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-submitted"] });
      setSelectedId(null);
    },
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/scenarios/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-submitted"] });
      setSelectedId(null);
    },
  });

  // --- 목록 뷰 ---
  if (selectedId == null) {
    if (isLoading) return <p>불러오는 중…</p>;
    if (isError)
      return <p style={{ color: "crimson" }}>{(error as any)?.message}</p>;

    return (
      <div
        className="admin-panel"
        style={{ maxWidth: 960, margin: "24px auto" }}
      >
        <h2>신규 시나리오 관리</h2>
        <table className="light-table">
          <thead>
            <tr>
              <th>#</th>
              <th>제목</th>
              <th>작성자</th>
              <th>제출일</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {list!.map((s) => (
              <tr
                key={s.id}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedId(s.id)}
              >
                <td>{s.id}</td>
                <td style={{ fontWeight: 600 }}>{s.title}</td>
                <td>
                  {s.authorId} ({s.authorEmail})
                </td>
                <td>
                  {s.submittedAt
                    ? new Date(s.submittedAt).toLocaleString()
                    : "-"}
                </td>
                <td>{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // --- 상세 뷰 ---
  if (isDetailFetching) return <p>상세 불러오는 중…</p>;
  if (!detail) return null;

  const canDecision =
    detail.status === "SUBMITTED" || detail.status === "REVIEWING";

  return (
    <div className="admin-panel" style={{ maxWidth: 960, margin: "24px auto" }}>
      <button onClick={() => setSelectedId(null)} style={{ marginBottom: 12 }}>
        ← 목록으로
      </button>
      <h2>{detail.title}</h2>
      <div style={{ fontSize: 13, color: "#666", marginTop: 6 }}>
        작성자: {detail.authorId} ({detail.authorEmail}) · 생성:{" "}
        {new Date(detail.createdAt).toLocaleString()}
        {detail.submittedAt && (
          <> · 제출: {new Date(detail.submittedAt).toLocaleString()}</>
        )}
        {detail.updatedAt && (
          <> · 수정: {new Date(detail.updatedAt).toLocaleString()}</>
        )}
      </div>

      <pre
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          background: "#fafafa",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #eee",
          minHeight: 160,
          marginTop: 12,
          color: "#111",
        }}
      >
        {detail.content}
      </pre>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          onClick={() => review.mutate(detail.id)}
          disabled={review.isPending || detail.status === "REVIEWING"}
        >
          {review.isPending ? "검토 중…" : "검토"}
        </button>
        <button
          onClick={() => approve.mutate(detail.id)}
          disabled={!canDecision || approve.isPending}
          className="btn-primary"
        >
          {approve.isPending ? "승인 중…" : "승인"}
        </button>
        <button
          onClick={() => {
            const reason = prompt("반려 사유를 입력하세요 (선택):") || "";
            reject.mutate({ id: detail.id, reason });
          }}
          disabled={!canDecision || reject.isPending}
          className="btn-danger"
        >
          {reject.isPending ? "반려 중…" : "반려"}
        </button>
        <button
          onClick={() => {
            if (confirm("정말 삭제하시겠습니까?")) del.mutate(detail.id);
          }}
          disabled={del.isPending}
          className="btn-danger"
        >
          {del.isPending ? "삭제 중…" : "삭제"}
        </button>
      </div>
    </div>
  );
}
