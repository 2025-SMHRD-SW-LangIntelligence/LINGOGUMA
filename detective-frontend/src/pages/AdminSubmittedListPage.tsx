// src/pages/AdminSubmittedListPage.tsx
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../shared/api/client";

type Item = {
  id: number;
  title: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | "DRAFT";
  authorIndex: number;
  authorId: string;
  authorEmail: string;
  submittedAt?: string | null;
  createdAt: string;
};

export default function AdminSubmittedListPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-submitted"],
    queryFn: async () => {
      const { data } = await api.get<Item[]>("/admin/scenarios/submitted");
      return data;
    },
  });

  if (isLoading) return <p>불러오는 중…</p>;
  if (isError)
    return <p style={{ color: "crimson" }}>{(error as any)?.message}</p>;

  return (
    <div style={{ maxWidth: 960, margin: "24px auto" }}>
      <h2>제출된 시나리오</h2>
      <ul style={{ display: "grid", gap: 8 }}>
        {data!.map((s) => (
          <li
            key={s.id}
            style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Link
                to={`/admin/scenarios/submitted/${s.id}`}
                style={{
                  fontWeight: 700,
                  textDecoration: "none",
                  color: "#222",
                }}
              >
                {s.title}
              </Link>
              <span style={{ fontSize: 12, color: "#666" }}>
                제출:{" "}
                {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "-"}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "#666" }}>
              상태: {s.status} · 작성자: {s.authorId} ({s.authorEmail})
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
