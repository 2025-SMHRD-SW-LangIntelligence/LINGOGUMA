import React, { useMemo, useState, useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { api } from "../../shared/api/client";

type Status = "DRAFT" | "SUBMITTED" | "REVIEWING" | "APPROVED" | "REJECTED";

type Row = {
  id: number;
  title: string;
  status: Status;
  authorIndex: number;
  authorId: string;
  authorEmail: string;
  createdAt: string;
  submittedAt?: string | null;
  updatedAt: string;
};

type Detail = {
  id: number;
  title: string;
  content: string;
  status: Status;
  authorIndex: number;
  authorId: string;
  authorEmail: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
};

const STATUS_OPTIONS = [
  "ALL",
  "DRAFT",
  "SUBMITTED",
  "REVIEWING",
  "APPROVED",
  "REJECTED",
] as const;

// 🔹 간단 디바운스 훅
function useDebouncedValue<T>(value: T, delay = 100) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

interface Props {
  onClose?: () => void; // 🔹 상위에서 닫기/뒤로가기 제어 가능
}

export default function AdminAllScenariosPanel({ onClose }: Props) {
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("ALL");
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 100);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const qc = useQueryClient();

  // 목록
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["admin-scenarios-all", status, debouncedQ],
    queryFn: async ({ signal }) => {
      const params: any = {};
      if (status !== "ALL") params.status = status;
      if (debouncedQ.trim()) params.q = debouncedQ.trim();
      const { data } = await api.get<Row[]>("/admin/scenarios", {
        params,
        signal,
      });
      return data;
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const rows = useMemo(() => data ?? [], [data]);

  // 상세(인라인)
  const {
    data: detail,
    isFetching: isDetailFetching,
    isError: isDetailError,
    error: detailError,
  } = useQuery({
    queryKey: ["admin-scenario-detail-inline", expandedId],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Detail>(`/admin/scenarios/${expandedId}`, {
        signal,
      });
      return data;
    },
    enabled: expandedId != null,
    placeholderData: keepPreviousData,
  });

  // 상태 변경 액션
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-scenarios-all"] });
    qc.invalidateQueries({ queryKey: ["admin-submitted"] });
    if (expandedId)
      qc.invalidateQueries({
        queryKey: ["admin-scenario-detail-inline", expandedId],
      });
  };

  const review = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/admin/scenarios/${id}/review`);
    },
    onSuccess: invalidate,
  });

  const approve = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/admin/scenarios/${id}/approve`);
    },
    onSuccess: invalidate,
  });

  const reject = useMutation({
    mutationFn: async (req: { id: number; reason: string }) => {
      await api.post(`/admin/scenarios/${req.id}/reject`, {
        reason: req.reason,
      });
    },
    onSuccess: invalidate,
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/scenarios/${id}`);
    },
    onSuccess: () => {
      invalidate();
      if (expandedId) setExpandedId(null);
    },
  });

  if (isLoading) return <p>불러오는 중…</p>;
  if (isError)
    return <p style={{ color: "crimson" }}>{(error as any)?.message}</p>;

  return (
    <div style={{ maxWidth: 1080, margin: "24px auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>전체 시나리오 관리</h2>
        {onClose && (
          <button onClick={onClose} style={{ cursor: "pointer" }}>
            닫기
          </button>
        )}
      </div>

      {/* 검색/필터 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          placeholder="제목/작성자ID/이메일/닉네임 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        {isFetching && (
          <span style={{ fontSize: 12, color: "#666" }}>검색 중…</span>
        )}
      </div>

      {/* 목록 테이블 */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#fafafa" }}>
            <th style={th}>#</th>
            <th style={th}>제목</th>
            <th style={th}>상태</th>
            <th style={th}>작성자</th>
            <th style={th}>생성</th>
            <th style={th}>제출</th>
            <th style={th}>액션</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const expanded = expandedId === r.id;
            return (
              <RowFragment
                key={r.id}
                row={r}
                expanded={expanded}
                onToggle={() => setExpandedId(expanded ? null : r.id)}
                detail={expanded ? detail : undefined}
                isDetailFetching={expanded ? isDetailFetching : false}
                isDetailError={expanded ? isDetailError : false}
                detailError={expanded ? (detailError as any) : undefined}
                onReview={() => review.mutate(r.id)}
                onApprove={() => approve.mutate(r.id)}
                onReject={() => {
                  const reason = prompt("반려 사유를 입력하세요 (선택):") || "";
                  reject.mutate({ id: r.id, reason });
                }}
                onDelete={() => {
                  if (
                    confirm(
                      "정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                    )
                  )
                    del.mutate(r.id);
                }}
                isReviewing={review.isPending}
                isApproving={approve.isPending}
                isRejecting={reject.isPending}
                isDeleting={del.isPending}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 8,
  borderBottom: "1px solid #eee",
};
const td: React.CSSProperties = {
  padding: 8,
  borderBottom: "1px solid #f1f1f1",
  verticalAlign: "top",
};
const pill: React.CSSProperties = {
  fontSize: 12,
  padding: "2px 8px",
  borderRadius: 999,
  background: "#eef",
  border: "1px solid #dde",
  display: "inline-block",
};

function RowFragment(props: {
  row: Row;
  expanded: boolean;
  onToggle: () => void;
  detail?: Detail;
  isDetailFetching: boolean;
  isDetailError: boolean;
  detailError?: any;
  onReview: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  isReviewing: boolean;
  isApproving: boolean;
  isRejecting: boolean;
  isDeleting: boolean;
}) {
  const {
    row,
    expanded,
    onToggle,
    detail,
    isDetailFetching,
    isDetailError,
    detailError,
    onReview,
    onApprove,
    onReject,
    onDelete,
    isReviewing,
    isApproving,
    isRejecting,
    isDeleting,
  } = props;

  return (
    <>
      {/* 메인 행 */}
      <tr>
        <td style={td}>{row.id}</td>
        <td style={td}>
          <button
            onClick={onToggle}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              fontSize: 15,
              fontWeight: 700,
              color: "#222",
              cursor: "pointer",
              textAlign: "left",
            }}
            title={expanded ? "내용 숨기기" : "내용 보기"}
          >
            {row.title}
          </button>
        </td>
        <td style={td}>
          <span style={pill}>{row.status}</span>
        </td>
        <td style={td}>
          {row.authorId} ({row.authorEmail})
        </td>
        <td style={td}>{new Date(row.createdAt).toLocaleString()}</td>
        <td style={td}>
          {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "-"}
        </td>
        <td style={{ ...td, minWidth: 280 }}>
          <button
            onClick={onReview}
            disabled={isReviewing}
            style={{ padding: "4px 8px", marginRight: 6, cursor: "pointer" }}
          >
            {isReviewing ? "검토…" : "검토"}
          </button>
          <button
            onClick={onApprove}
            disabled={isApproving}
            style={{ padding: "4px 8px", marginRight: 6, cursor: "pointer" }}
          >
            {isApproving ? "승인…" : "승인"}
          </button>
          <button
            onClick={onReject}
            disabled={isRejecting}
            style={{
              padding: "4px 8px",
              marginRight: 6,
              cursor: "pointer",
              border: "1px solid #e68",
              background: "white",
              color: "#e68",
              borderRadius: 6,
            }}
          >
            {isRejecting ? "반려…" : "반려"}
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            style={{
              padding: "4px 8px",
              cursor: "pointer",
              border: "1px solid #e33",
              background: "white",
              color: "#e33",
              borderRadius: 6,
            }}
          >
            {isDeleting ? "삭제…" : "삭제"}
          </button>
        </td>
      </tr>

      {/* 확장 행 */}
      {expanded && (
        <tr>
          <td style={{ ...td, background: "#fafafa" }} colSpan={7}>
            {isDetailFetching && <p>내용 불러오는 중…</p>}
            {isDetailError && (
              <p style={{ color: "crimson" }}>
                {detailError?.message || "내용을 불러오지 못했습니다."}
              </p>
            )}
            {detail && (
              <>
                <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                  작성자: {detail.authorId} ({detail.authorEmail}) · 생성:{" "}
                  {new Date(detail.createdAt).toLocaleString()}
                  {detail.submittedAt && (
                    <>
                      {" "}
                      · 제출: {new Date(detail.submittedAt).toLocaleString()}
                    </>
                  )}
                  {detail.updatedAt && (
                    <> · 수정: {new Date(detail.updatedAt).toLocaleString()}</>
                  )}
                </div>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    background: "white",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #eee",
                    margin: 0,
                  }}
                >
                  {detail.content}
                </pre>
              </>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
