import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../shared/api/client";

type ScenarioItem = {
  id: number;
  title: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  createdAt: string;
};

export default function AuthorScenarioListPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["my-scenarios"],
    queryFn: async () => {
      const { data } = await api.get<ScenarioItem[]>("/scenarios/me");
      return data;
    },
  });

  if (isLoading) return <p>불러오는 중…</p>;
  if (isError)
    return <p style={{ color: "crimson" }}>{(error as any)?.message}</p>;

  return (
    <div style={{ maxWidth: 720, margin: "24px auto" }}>
      <h2>내 시나리오 관리</h2>
      <div style={{ marginBottom: 12 }}>
        <Link to="/author/scenarios/new">+ 새 초안</Link>
      </div>
      <ul style={{ display: "grid", gap: 8 }}>
        {data!.map((s) => (
          <li
            key={s.id}
            style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Link
                to={`/author/scenarios/${s.id}`}
                style={{
                  fontWeight: 700,
                  textDecoration: "none",
                  color: "#222",
                }}
              >
                {s.title}
              </Link>
              <span style={{ fontSize: 12, color: "#666" }}>
                {new Date(s.createdAt).toLocaleString()}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "#666" }}>상태: {s.status}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
