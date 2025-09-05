import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import "@/shared/styles/CaseAnalysisPage.css";
import { api } from "@/shared/api/client";

/* =========================
   타입
   ========================= */
type Skills = {
  logic: number;
  creativity: number;
  focus: number;
  diversity: number;
  depth: number;
};

type GameResultDTO = {
  resultId: number;
  sessionId: number;
  scenIdx: number;
  userIdx: number | null;
  correct: boolean;
  answerJson: Record<string, any>;
  skillsJson: Record<string, any>;
};

type ScenarioDetail = {
  scenIdx: number;
  scenTitle: string;
  scenSummary: string;
  scenLevel: number;
  contentJson?: string | any;
};

type VerdictDTO = { culprit: boolean; motive: boolean; method: boolean };
type PlayerEvidenceDTO = {
  text: string;
  matched: boolean;
  matchedId: string | null;
  matchedName: string | null;
};
type SimilarityRes = {
  sim_culprit: number;
  sim_motive: number;
  sim_method: number;
  sim_evidence: number;
  sim_time: number;
  sim_avg: number;
  sim_avg3: number;
  threshold: number;
  passed: boolean;
  passed3: boolean;
  verdict: VerdictDTO;
  evidence_breakdown: PlayerEvidenceDTO[];
};

/* =========================
   카테고리
   ========================= */
const categories = ["논리력", "창의력", "집중력", "다양성", "깊이"];

export default function AnalysisPage() {
  const { scenarioId } = useParams();
  const location = useLocation();
  const nav = useNavigate();

  // resultId는 querystring에서 받음
  const search = new URLSearchParams(location.search);
  const ridRaw = search.get("resultId");
  const resultId = ridRaw ? Number(ridRaw) : NaN;

  const [culpritId, setCulpritId] = useState<string>("");
  const [culpritName, setCulpritName] = useState<string>("");
  const [isCorrectBackup, setIsCorrectBackup] = useState<boolean>(false);

  const [skills, setSkills] = useState<Skills>({
    logic: 0,
    creativity: 0,
    focus: 0,
    diversity: 0,
    depth: 0,
  });
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 유사도
  const [sim, setSim] = useState<SimilarityRes | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(true);
  const [simErr, setSimErr] = useState<string | null>(null);

  /* =========================
     결과 API 호출
     ========================= */
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErrorMsg(null);

      if (!Number.isFinite(resultId) || resultId <= 0) {
        setErrorMsg(
          "결과 ID(resultId)가 없습니다. 결과 화면에서 다시 이동해주세요."
        );
        setLoading(false);
        return;
      }

      try {
        const res = await api.get<GameResultDTO>(`/game-results/${resultId}`);
        const data = res.data;
        setCulpritId(String(data?.answerJson?.culprit ?? ""));
        setIsCorrectBackup(Boolean(data.correct));
        setAnswers(data.answerJson || {});
        const sj: any = data.skillsJson || {};
        setSkills({
          logic: Number(sj.logic ?? 0),
          creativity: Number(sj.creativity ?? 0),
          focus: Number(sj.focus ?? 0),
          diversity: Number(sj.diversity ?? 0),
          depth: Number(sj.depth ?? 0),
        });
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 403) setErrorMsg("이 결과를 볼 권한이 없습니다.");
        else if (status === 404) setErrorMsg("결과를 찾을 수 없습니다.");
        else setErrorMsg("결과 불러오기 실패. 잠시 후 다시 시도해주세요.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [resultId]);

  /* =========================
     범인 이름 매핑
     ========================= */
  useEffect(() => {
    const mapName = async () => {
      try {
        if (!scenarioId) return;
        const res = await api.get<ScenarioDetail>(`/scenarios/${scenarioId}`);
        let content: any = res.data.contentJson;
        if (typeof content === "string") {
          try {
            content = JSON.parse(content);
          } catch {
            content = {};
          }
        }
        const chars: any[] = Array.isArray(content?.characters)
          ? content.characters
          : [];
        const byId: Record<string, string> = {};
        chars.forEach((c: any) => {
          const id = String(c?.id ?? "");
          const name = String(c?.name ?? "");
          if (id && name) byId[id] = name;
        });
        setCulpritName(byId[culpritId] || culpritId || "");
      } catch {
        setCulpritName(culpritId);
      }
    };
    if (culpritId && scenarioId) mapName();
  }, [culpritId, scenarioId]);

  /* =========================
     유사도 API 호출
     ========================= */
  useEffect(() => {
    const run = async () => {
      setSimLoading(true);
      setSimErr(null);
      try {
        const resp = await api.get(`/game-results/${resultId}/similarity`, {
          validateStatus: () => true,
        });
        if (resp.status === 200) {
          setSim(resp.data);
        } else {
          setSimErr("유사도 분석 결과를 가져오지 못했습니다.");
        }
      } catch {
        setSimErr("유사도 분석 호출 실패");
      } finally {
        setSimLoading(false);
      }
    };
    if (Number.isFinite(resultId) && resultId > 0) run();
  }, [resultId]);

  /* =========================
     차트 데이터
     ========================= */
  const recent = useMemo(
    () => [
      skills.logic,
      skills.creativity,
      skills.focus,
      skills.diversity,
      skills.depth,
    ],
    [skills]
  );

  const first = useMemo(
    () => recent.map((v, i) => Math.max(0, v - (i % 2 === 0 ? 8 : 12))),
    [recent]
  );

  const data = useMemo(
    () =>
      categories.map((c, i) => ({
        name: c,
        first: first[i] ?? 0,
        recent: recent[i] ?? 0,
      })),
    [first, recent]
  );

  const avgFirst = Math.round(first.reduce((a, b) => a + b, 0) / first.length);
  const avgRecent = Math.round(
    recent.reduce((a, b) => a + b, 0) / recent.length
  );
  const avgDelta = avgRecent - avgFirst;

  // 제출 답변 보기용(키 폴백 처리)
  const viewAnswers = useMemo(() => {
    const pick = (keys: string[]) => {
      for (const k of keys) {
        const v = answers?.[k];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
      return "";
    };
    return {
      동기: pick(["motive", "why"]),
      수법: pick(["method", "how"]),
      증거: pick(["evidence", "evidenceText"]),
      시간: pick(["time", "when"]),
    };
  }, [answers]);

  // 최종 정답 문구: 유사도 verdict가 있으면 그걸 우선
  const solved =
    sim && typeof sim.verdict?.culprit === "boolean"
      ? sim.verdict.culprit
      : isCorrectBackup;

  const YesNo = ({ ok }: { ok: boolean }) => (
    <span
      style={{
        marginLeft: 6,
        padding: "1px 8px",
        borderRadius: 999,
        background: ok ? "#dcfce7" : "#fee2e2",
        color: ok ? "#166534" : "#991b1b",
        fontWeight: 700,
      }}
    >
      {ok ? "O" : "X"}
    </span>
  );

  if (loading) {
    return (
      <div className="cap-root">
        <div className="intro-loading">불러오는 중…</div>
      </div>
    );
  }
  if (errorMsg) {
    return (
      <div className="cap-root">
        <div className="intro-loading">{errorMsg}</div>
        <button onClick={() => nav("/scenarios")}>시나리오 목록</button>
      </div>
    );
  }

  return (
    <div className="cap-root">
      <section className="cap-card">
        <header className="cap-header">
          <h1>추리 결과 분석</h1>
          <p className="cap-sub">
            선택한 범인: <b>{culpritName || culpritId || "미입력"}</b>
          </p>
          <p>{solved ? "정답입니다" : "틀렸습니다 ❌"}</p>
        </header>

        {/* KPI */}
        <section className="cap-kpis">
          <div className="cap-kpi">
            <div className="cap-kpi-label">평균 점수(처음)</div>
            <div className="cap-kpi-value">{avgFirst}</div>
          </div>
          <div className="cap-kpi">
            <div className="cap-kpi-label">평균 점수(최근)</div>
            <div className="cap-kpi-value">{avgRecent}</div>
          </div>
          <div className={`cap-kpi ${avgDelta >= 0 ? "pos" : "neg"}`}>
            <div className="cap-kpi-label">평균 변화</div>
            <div className="cap-kpi-value">
              {avgDelta >= 0 ? `+${avgDelta}` : avgDelta}
            </div>
          </div>
        </section>

        {/* 차트 2개 */}
        <div className="cap-charts-row">
          <article className="cap-chart-tile">
            <h2>처음 플레이 결과</h2>
            <div className="cap-chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data} outerRadius="75%">
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={6} />
                  <Tooltip />
                  <Radar
                    name="처음"
                    dataKey="first"
                    stroke="#98A6FF"
                    fill="#98A6FF"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="cap-chart-tile">
            <h2>최근 플레이 결과</h2>
            <div className="cap-chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data} outerRadius="75%">
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={6} />
                  <Tooltip />
                  <Radar
                    name="최근"
                    dataKey="recent"
                    stroke="#1D4ED8"
                    fill="#1D4ED8"
                    fillOpacity={0.45}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>

        {/* 제출 답변 + 유사도 */}
        <section className="cap-feedback" style={{ marginTop: 12 }}>
          <h3>제출한 답변(미리보기)</h3>

          {simLoading && (
            <p style={{ opacity: 0.8 }}>유사도 분석 불러오는 중...</p>
          )}
          {simErr && <p style={{ color: "crimson" }}>{simErr}</p>}

          <ul>
            <li>
              <b>동기</b>: {viewAnswers.동기 || "(비어 있음)"}{" "}
              {sim ? <YesNo ok={!!sim.verdict?.motive} /> : null}
              {sim ? (
                <span style={{ marginLeft: 8, opacity: 0.8 }}>
                  {Math.round((sim.sim_motive ?? 0) * 100)}%
                </span>
              ) : null}
            </li>
            <li>
              <b>수법</b>: {viewAnswers.수법 || "(비어 있음)"}{" "}
              {sim ? <YesNo ok={!!sim.verdict?.method} /> : null}
              {sim ? (
                <span style={{ marginLeft: 8, opacity: 0.8 }}>
                  {Math.round((sim.sim_method ?? 0) * 100)}%
                </span>
              ) : null}
            </li>
          </ul>

          {/* 증거 브레이크다운(있으면) */}
          {sim?.evidence_breakdown?.length ? (
            <div style={{ marginTop: 10 }}>
              <h4>증거 매칭</h4>
              <ul style={{ paddingLeft: 18 }}>
                {sim.evidence_breakdown.map((it, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{it.text}</span>
                    <YesNo ok={it.matched} />
                    {it.matched && it.matchedName ? (
                      <span style={{ marginLeft: 6, opacity: 0.8 }}>
                        (정답: {it.matchedName})
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* 종료 버튼 */}
        <div className="cap-actions">
          <button className="cap-exit-btn" onClick={() => nav("/scenarios")}>
            종료하기
          </button>
        </div>
      </section>
    </div>
  );
}
