// src/pages/AdminScenarioRegisterPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../shared/api/client";

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

/** 100ms 디바운스 */
function useDebouncedValue<T>(value: T, delay = 100) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function AdminScenarioRegisterPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 100);

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
    <div style={{ maxWidth: 1100, margin: "24px auto" }}>
      <h2>시나리오 등록 관리</h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제목/작성자 검색"
          style={{ padding: 8, flex: 1 }}
        />
        {(approved.isFetching || published.isFetching) && (
          <span style={{ fontSize: 12, color: "#888" }}>검색 중…</span>
        )}
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        {/* 승인됨(등록 가능) */}
        <section>
          <h3 style={{ marginBottom: 8 }}>승인됨 (등록 가능)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={th}>제목</th>
                <th style={th}>작성자</th>
                <th style={th}>수정</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rowsApproved.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.title}</td>
                  <td style={td}>{r.authorName}</td>
                  <td style={td}>
                    {new Date(r.updatedAt || r.createdAt).toLocaleString()}
                  </td>
                  <td style={tdRight}>
                    <button
                      onClick={() => publishMut.mutate(r.id)}
                      disabled={publishMut.isPending}
                      style={btnPrimary}
                    >
                      {publishMut.isPending ? "등록 중…" : "등록"}
                    </button>
                  </td>
                </tr>
              ))}
              {rowsApproved.length === 0 && (
                <tr>
                  <td style={td} colSpan={4}>
                    결과 없음
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* 등록됨(공개 중) */}
        <section>
          <h3 style={{ marginBottom: 8 }}>등록됨 (공개 중)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={th}>제목</th>
                <th style={th}>작성자</th>
                <th style={th}>수정</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rowsPublished.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.title}</td>
                  <td style={td}>{r.authorName}</td>
                  <td style={td}>
                    {new Date(r.updatedAt || r.createdAt).toLocaleString()}
                  </td>
                  <td style={tdRight}>
                    <button
                      onClick={() => unpublishMut.mutate(r.id)}
                      disabled={unpublishMut.isPending}
                      style={btnDanger}
                    >
                      {unpublishMut.isPending ? "해제 중…" : "등록 해제"}
                    </button>
                  </td>
                </tr>
              ))}
              {rowsPublished.length === 0 && (
                <tr>
                  <td style={td} colSpan={4}>
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

const th: React.CSSProperties = {
  textAlign: "left",
  padding: 8,
  borderBottom: "1px solid #eee",
};
const td: React.CSSProperties = {
  padding: 8,
  borderBottom: "1px solid #f2f2f2",
};
const tdRight: React.CSSProperties = { ...td, textAlign: "right" };
const btn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer",
  border: "1px solid #ccc",
  background: "#fff",
};
const btnPrimary: React.CSSProperties = {
  ...btn,
  borderColor: "#2d6cdf",
  color: "#2d6cdf",
};
const btnDanger: React.CSSProperties = {
  ...btn,
  borderColor: "#e33",
  color: "#e33",
};
