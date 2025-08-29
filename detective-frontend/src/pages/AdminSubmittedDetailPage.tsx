// src/pages/AdminSubmittedDetailPage.tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../shared/api/client";

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

export default function AdminSubmittedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-submitted-detail", id],
    queryFn: async () => {
      const { data } = await api.get<Detail>(`/admin/scenarios/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const review = useMutation({
    mutationFn: async () => {
      await api.post(`/admin/scenarios/${id}/review`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-submitted-detail", id] });
      qc.invalidateQueries({ queryKey: ["admin-submitted"] });
    },
  });

  const approve = useMutation({
    mutationFn: async () => {
      await api.post(`/admin/scenarios/${id}/approve`);
    },
    onSuccess: () => {
      // 승인 후 목록으로
      qc.invalidateQueries({ queryKey: ["admin-submitted"] });
      nav("/admin/scenarios/submitted");
    },
  });

  const reject = useMutation({
    mutationFn: async (reason: string) => {
      await api.post(`/admin/scenarios/${id}/reject`, { reason });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-submitted"] });
      nav("/admin/scenarios/submitted");
    },
  });

  const del = useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/scenarios/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-submitted"] });
      nav("/admin/scenarios/submitted");
    },
  });

  if (isLoading) return <p>불러오는 중…</p>;
  if (isError)
    return <p style={{ color: "crimson" }}>{(error as any)?.message}</p>;
  if (!data) return null;

  const canReview = data.status === "SUBMITTED" || data.status === "REVIEWING";
  const canDecision =
    data.status === "SUBMITTED" || data.status === "REVIEWING";

  return (
    <div style={{ maxWidth: 960, margin: "24px auto" }}>
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
      <div style={{ fontSize: 13, color: "#666", marginTop: 6 }}>
        작성자: {data.authorId} ({data.authorEmail}) · 생성:{" "}
        {new Date(data.createdAt).toLocaleString()}
        {data.submittedAt && (
          <> · 제출: {new Date(data.submittedAt).toLocaleString()}</>
        )}
        {data.updatedAt && (
          <> · 수정: {new Date(data.updatedAt).toLocaleString()}</>
        )}
      </div>
      <hr style={{ margin: "16px 0" }} />
      // AdminSubmittedDetailPage.tsx (변경 부분만)
      <pre
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          background: "#fafafa",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #eee",
          minHeight: 160,
          color: "#111 !important", // ✅ 글자색 강제 지정
        }}
      >
        {data.content}
      </pre>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Link to="/admin/scenarios/submitted">← 목록으로</Link>

        {/* 검토 전환: SUBMITTED → REVIEWING (REVIEWING이면 비활성화만) */}
        <button
          onClick={() => review.mutate()}
          disabled={review.isPending || data.status === "REVIEWING"}
          style={{ marginLeft: "auto", padding: "6px 10px", cursor: "pointer" }}
          title={
            data.status === "REVIEWING" ? "이미 검토 중" : "검토 상태로 전환"
          }
        >
          {review.isPending ? "검토 중…" : "검토"}
        </button>

        {/* 승인/반려: SUBMITTED/REVIEWING에서 가능 */}
        <button
          onClick={() => approve.mutate()}
          disabled={!canDecision || approve.isPending}
          style={{ padding: "6px 10px", cursor: "pointer" }}
        >
          {approve.isPending ? "승인 중…" : "승인"}
        </button>
        <button
          onClick={() => {
            const reason = prompt("반려 사유를 입력하세요 (선택):") || "";
            reject.mutate(reason);
          }}
          disabled={!canDecision || reject.isPending}
          style={{
            padding: "6px 10px",
            cursor: "pointer",
            border: "1px solid #e68",
            background: "white",
            color: "#e68",
            borderRadius: 6,
          }}
        >
          {reject.isPending ? "반려 중…" : "반려"}
        </button>

        {/* 삭제: 상태 무관 (관리자 권한) */}
        <button
          onClick={() => {
            if (confirm("정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."))
              del.mutate();
          }}
          disabled={del.isPending}
          style={{
            padding: "6px 10px",
            cursor: "pointer",
            border: "1px solid #e33",
            background: "white",
            color: "#e33",
            borderRadius: 6,
          }}
        >
          {del.isPending ? "삭제 중…" : "삭제"}
        </button>
      </div>
    </div>
  );
}
