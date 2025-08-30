// src/features/admin/AdminRegisterPanel.tsx
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import "./admin-panel.css";

type Row = {
  id: number;
  title: string;
  status:
    | "APPROVED"
    | "PUBLISHED"
    | "DRAFT"
    | "SUBMITTED"
    | "REJECTED"
    | "REVIEWING";
  authorName: string;
  createdAt: string;
  updatedAt: string;
};

/** 100ms 디바운스 훅 */
function useDebouncedValue<T>(value: T, delay = 100) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function AdminRegisterPanel() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 100);

  // 승인된 시나리오 목록
  const approved = useQuery({
    queryKey: ["admin-scn-approved", dq],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Row[]>("/admin/scenarios/approved", {
        params: dq ? { q: dq } : undefined,
        signal,
      });
      return data;
    },
    placeholderData: (prev) => prev,
  });

  // 공개된 시나리오 목록
  const published = useQuery({
    queryKey: ["admin-scn-published", dq],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Row[]>("/admin/scenarios/published", {
        params: dq ? { q: dq } : undefined,
        signal,
      });
      return data;
    },
    placeholderData: (prev) => prev,
  });

  // 등록
  const publishMut = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/admin/scenarios/${id}/publish`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-scn-approved"] });
      qc.invalidateQueries({ queryKey: ["admin-scn-published"] });
      qc.invalidateQueries({ queryKey: ["public-scenarios"] });
    },
  });

  // 등록 해제
  const unpublishMut = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/admin/scenarios/${id}/unpublish`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-scn-approved"] });
      qc.invalidateQueries({ queryKey: ["admin-scn-published"] });
      qc.invalidateQueries({ queryKey: ["public-scenarios"] });
    },
  });

  const rowsApproved = useMemo(() => approved.data ?? [], [approved.data]);
  const rowsPublished = useMemo(() => published.data ?? [], [published.data]);

  return (
    <div
      className="admin-panel"
      style={{ maxWidth: 1100, margin: "24px auto" }}
    >
      <h2>시나리오 발행 관리</h2>

      {/* 검색 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제목/작성자 검색"
          style={{
            padding: 8,
            flex: 1,
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
        {(approved.isFetching || published.isFetching) && (
          <span style={{ fontSize: 12, color: "#aaa" }}>검색 중…</span>
        )}
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        {/* 승인됨(등록 가능) */}
        <section>
          <h3>게시 대기/보류</h3>
          <table className="light-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>작성자</th>
                <th>수정</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rowsApproved.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>{r.authorName}</td>
                  <td>
                    {new Date(r.updatedAt || r.createdAt).toLocaleString()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      onClick={() => publishMut.mutate(r.id)}
                      disabled={publishMut.isPending}
                      className="btn-primary"
                    >
                      {publishMut.isPending ? "등록 중…" : "등록"}
                    </button>
                  </td>
                </tr>
              ))}
              {rowsApproved.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{ textAlign: "center", color: "#666" }}
                  >
                    결과 없음
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* 등록됨(공개 중) */}
        <section>
          <h3>게시</h3>
          <table className="light-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>작성자</th>
                <th>수정</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rowsPublished.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>{r.authorName}</td>
                  <td>
                    {new Date(r.updatedAt || r.createdAt).toLocaleString()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      onClick={() => unpublishMut.mutate(r.id)}
                      disabled={unpublishMut.isPending}
                      className="btn-danger"
                    >
                      {unpublishMut.isPending ? "해제 중…" : "등록 해제"}
                    </button>
                  </td>
                </tr>
              ))}
              {rowsPublished.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{ textAlign: "center", color: "#666" }}
                  >
                    결과 없음
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
