// 내 시나리오 관리
import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";

type ScenarioItem = {
  id: number;
  title: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  createdAt: string;
};

interface Props {
  onNewScenario: () => void; // 새 초안 작성 탭으로 전환
  onSelectScenario: (id: number) => void; // 특정 시나리오 상세 탭으로 전환
}

export default function AuthorMyScenarioPanel({
  onNewScenario,
  onSelectScenario,
}: Props) {
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
        <button
          onClick={onNewScenario}
          style={{
            background: "#f39c12",
            color: "white",
            border: "none",
            padding: "6px 12px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          + 새 시나리오
        </button>
      </div>
      <ul style={{ display: "grid", gap: 8 }}>
        {data!.map((s) => (
          <li
            key={s.id}
            onClick={() => onSelectScenario(s.id)}
            style={{
              border: "1px solid #eee",
              padding: 12,
              borderRadius: 8,
              background: "white",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, color: "#222" }}>{s.title}</span>
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
