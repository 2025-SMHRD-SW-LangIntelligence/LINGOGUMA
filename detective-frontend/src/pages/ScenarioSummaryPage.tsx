import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../shared/api/client";
import { useScenario } from "../store/scenario.store";
import "./ScenarioSummaryPage.css";

type ID = string;
type Suspect = { id: ID; name: string; avatar?: string; full?: string };
type Summary = {
  title?: string;
  prompt?: string; // 시나리오 소개/브리핑
  background?: string;
  suspects: Suspect[];
  timeLimitSec?: number;
};

function resolveURL(p?: string) {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  return p.startsWith("/") ? `${b}${p}` : `${b}/${p}`;
}

async function loadSummary(id: string): Promise<Summary> {
  try {
    const r = await api.get(`/api/scenarios/${id}/overview`);
    const d = r.data ?? {};
    return {
      title: d.title ?? d.name ?? "",
      prompt: d.prompt ?? d.description ?? "",
      background: d.background,
      suspects: (d.suspects ?? []).map((s: any) => ({
        id: String(s.id ?? s.key ?? s.whoId),
        name: s.name ?? "Unknown",
        avatar: s.avatar,
        full: s.full,
      })),
      timeLimitSec: Number(d.timeLimitSec) || undefined,
    };
  } catch {}
  const r2 = await fetch(`/mock/${id}.json`, { cache: "no-store" });
  if (r2.ok) {
    const d = await r2.json();
    return {
      title: d.title ?? d.scenarioId ?? "",
      prompt: d.prompt ?? "",
      background: d.background,
      suspects: (d.suspects ?? []).map((s: any) => ({
        id: String(s.id),
        name: s.name,
        avatar: s.avatar,
        full: s.full,
      })),
      timeLimitSec: Number(d.timeLimitSec) || undefined,
    };
  }
  return { title: id, prompt: "", suspects: [] };
}

export default function ScenarioSummaryPage() {
  const nav = useNavigate();
  const { scenarioId = "" } = useParams<{ scenarioId: string }>();
  const setCurrentScenarioId = useScenario((s) => s.setCurrentScenarioId);

  const { data, isLoading } = useQuery({
    queryKey: ["scenario-summary", scenarioId],
    enabled: !!scenarioId,
    queryFn: () => loadSummary(scenarioId),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (scenarioId) setCurrentScenarioId(scenarioId);
  }, [scenarioId, setCurrentScenarioId]);

  const suspects = useMemo(() => data?.suspects ?? [], [data]);

  if (isLoading)
    return <div style={{ padding: 24, color: "#fff" }}>불러오는 중…</div>;
  if (!data)
    return (
      <div style={{ padding: 24, color: "#fff" }}>
        시나리오를 찾을 수 없습니다.
      </div>
    );

  const start = () => nav(`/play/${scenarioId}`); // ▶️ 게임 시작
  const back = () => nav("/scenarios");

  return (
    <div
      className="ov-root"
      style={
        data.background
          ? { backgroundImage: `url(${resolveURL(data.background)})` }
          : undefined
      }
    >
      <div className="ov-panel">
        <h1 className="ov-title">{data.title || "사건 개요"}</h1>

        {data.prompt && (
          <div className="ov-prompt">
            <p>{data.prompt}</p>
          </div>
        )}

        {!!suspects.length && (
          <section className="ov-suspects" aria-label="용의자 미리보기">
            {suspects.map((s) => (
              <div key={s.id} className="ov-suspect">
                <div className="ov-ava">
                  <img
                    src={resolveURL(s.avatar || s.full)}
                    alt={s.name}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = resolveURL(
                        "/avatars/placeholder.png"
                      );
                    }}
                  />
                </div>
                <div className="ov-name">{s.name}</div>
              </div>
            ))}
          </section>
        )}

        <div className="ov-meta">
          {typeof data.timeLimitSec === "number" && (
            <span>
              제한시간: {Math.floor(data.timeLimitSec / 60)}분{" "}
              {data.timeLimitSec % 60}초
            </span>
          )}
          <span>용의자 수: {suspects.length}명</span>
        </div>

        <div className="ov-actions">
          <button className="ov-btn ghost" onClick={back}>
            목록으로
          </button>
          <button className="ov-btn primary" onClick={start}>
            심문 시작
          </button>
        </div>
      </div>
    </div>
  );
}
