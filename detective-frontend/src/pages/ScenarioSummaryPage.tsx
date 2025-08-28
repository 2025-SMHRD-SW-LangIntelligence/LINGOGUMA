import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../shared/api/client";
import "./ScenarioSummaryPage.css";

type Suspect = { id: string; name: string; avatar: string };
type SummaryData = {
  /** 제목은 json의 scenarioId를 우선 사용 */
  scenarioId?: string;
  title?: string; // (보조용)
  intro?: string; // 없으면 prompt 사용
  prompt?: string; // 기존 json 호환
  hero?: string; // 큰 배너 이미지
  suspects?: Suspect[];
};

// ── 경로 보정: 외부 URL은 그대로, 그 외는 public 기준 ─────────────────
function resolveURL(p?: string) {
  if (!p) return undefined;
  let s = String(p).replace(/\\/g, "/"); // \ → /
  if (s.startsWith("./")) s = s.replace(/^\.\/+/, ""); // ./ 제거
  if (/^https?:\/\//i.test(s)) return s;

  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const norm = base.endsWith("/") ? base.slice(0, -1) : base;
  return s.startsWith("/") ? `${norm}${s}` : `${norm}/${s}`;
}

function normalizeToObject(raw: unknown) {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw && typeof raw === "object" ? (raw as object) : null;
}

/** 우선순위: API → /mock/:id-intro.json → /mock/:id.json */
async function loadScenarioSummary(id: string): Promise<SummaryData> {
  try {
    const r = await api.get(`/api/scenarios/${id}/intro`);
    const obj = normalizeToObject(r.data) as any;
    if (obj) return obj;
  } catch {}

  try {
    const r = await fetch(`/mock/${id}-intro.json`, { cache: "no-store" });
    if (r.ok) return (await r.json()) as SummaryData;
  } catch {}

  try {
    const r = await fetch(`/mock/${id}.json`, { cache: "no-store" });
    if (r.ok) return (await r.json()) as SummaryData;
  } catch {}

  return {};
}

export default function ScenarioSummaryPage() {
  const nav = useNavigate();
  const { scenarioId = "" } = useParams<{ scenarioId: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["scenario-intro", scenarioId],
    enabled: !!scenarioId,
    queryFn: () => loadScenarioSummary(scenarioId),
    staleTime: 5 * 60 * 1000,
  });

  // ✅ 화면 제목은 json의 scenarioId 우선, 없으면 URL 파라미터/타이틀 폴백
  const title = (data?.scenarioId ?? data?.title ?? scenarioId) || "";
  const description =
    data?.intro || data?.prompt || "시나리오 설명이 없습니다.";
  const suspects = useMemo(() => data?.suspects ?? [], [data]);

  const hero =
    resolveURL(data?.hero) || resolveURL("/assets/intro/default.jpg");

  const start = () => nav(`/play/${scenarioId}`); // 시작하기(게임 화면)
  const backToList = () => nav("/scenarios");

  if (isLoading) {
    return (
      <div className="intro-root">
        <div className="intro-loading">불러오는 중…</div>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="intro-root">
        <div className="intro-loading">시나리오 정보를 가져오지 못했어요.</div>
      </div>
    );
  }

  return (
    <div className="intro-root">
      <div className="intro-panel">
        {/* 상단: 제목 */}
        <div className="intro-head">
          <h1 className="intro-title">{title}</h1>
        </div>

        {/* 큰 배너(히어로) */}
        <div className="intro-hero">
          {hero && (
            <img
              src={hero}
              alt="scenario hero"
              onError={(e) => {
                e.currentTarget.src = resolveURL("/assets/intro/default.jpg")!;
              }}
            />
          )}
        </div>

        {/* 설명 패널 */}
        <section className="intro-desc">
          <p>{description}</p>
        </section>

        {/* 용의자 미리보기 */}
        {suspects.length > 0 && (
          <>
            <h2 className="intro-subtitle">용의자</h2>
            <div className="intro-suspects">
              {suspects.map((s) => (
                <figure className="intro-suspect" key={s.id}>
                  <div className="intro-avatar">
                    <img
                      src={resolveURL(s.avatar)}
                      alt={s.name}
                      onError={(e) => {
                        e.currentTarget.src = resolveURL(
                          "/avatars/placeholder.png"
                        )!;
                      }}
                    />
                  </div>
                  <figcaption>{s.name}</figcaption>
                </figure>
              ))}
            </div>
          </>
        )}

        {/* 하단 버튼 */}
        <div className="intro-actions">
          <button className="btn-outline" onClick={backToList}>
            목록으로
          </button>
          <button className="btn-primary" onClick={start}>
            시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
