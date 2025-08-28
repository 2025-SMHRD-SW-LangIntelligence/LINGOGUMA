// src/features/admin/AdminScenarioPanel.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import "./admin-panel.css";

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

function useDebouncedValue<T>(value: T, delay = 100) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function AdminScenarioPanel() {
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("ALL");
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 100);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const qc = useQueryClient();

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

  const { data: detail } = useQuery({
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

  const review = useMutation({
    mutationFn: async (id: number) => api.post(`/admin/scenarios/${id}/review`),
  });
  const approve = useMutation({
    mutationFn: async (id: number) =>
      api.post(`/admin/scenarios/${id}/approve`),
  });
  const reject = useMutation({
    mutationFn: async (req: { id: number; reason: string }) =>
      api.post(`/admin/scenarios/${req.id}/reject`, { reason: req.reason }),
  });
  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/scenarios/${id}`),
  });

  if (isLoading) return <p>불러오는 중…</p>;
  if (isError)
    return <p style={{ color: "crimson" }}>{(error as any)?.message}</p>;

  return (
    <div
      className="admin-panel"
      style={{ maxWidth: 1080, margin: "24px auto" }}
    >
      <h2>전체 시나리오 관리</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
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
          style={{
            flex: 1,
            padding: 8,
            border: "1px solid #ccc",
            borderRadius: 6,
          }}
        />
        {isFetching && (
          <span style={{ fontSize: 12, color: "#666" }}>검색 중…</span>
        )}
      </div>

      <table className="light-table">
        <thead>
          <tr>
            <th>#</th>
            <th>제목</th>
            <th>상태</th>
            <th>작성자</th>
            <th>생성</th>
            <th>제출</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const expanded = expandedId === r.id;
            return (
              <>
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>
                    <button
                      onClick={() => setExpandedId(expanded ? null : r.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      {r.title}
                    </button>
                  </td>
                  <td>{r.status}</td>
                  <td>
                    {r.authorId} ({r.authorEmail})
                  </td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td>
                    {r.submittedAt
                      ? new Date(r.submittedAt).toLocaleString()
                      : "-"}
                  </td>
                  <td>
                    <button onClick={() => review.mutate(r.id)}>검토</button>
                    <button
                      onClick={() => approve.mutate(r.id)}
                      className="btn-primary"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt("반려 사유 입력") || "";
                        reject.mutate({ id: r.id, reason });
                      }}
                      className="btn-danger"
                    >
                      반려
                    </button>
                    <button
                      onClick={() => del.mutate(r.id)}
                      className="btn-danger"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
                {expanded && detail && (
                  <tr>
                    <td colSpan={7}>
                      <pre
                        style={{
                          background: "#fafafa",
                          padding: 12,
                          border: "1px solid #eee",
                        }}
                      >
                        {detail.content}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
