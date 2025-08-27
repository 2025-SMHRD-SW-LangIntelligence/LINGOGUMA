import { useMemo } from "react";
import { useLocation, Navigate, useNavigate } from "react-router-dom";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import "./CaseAnalysisPage.css";

type AnalysisState = {
  culpritId: string;
  answers: Record<string, string>;
};

const categories = [
  "시간 관리",
  "정보 수집",
  "의심 탐지",
  "논리 추론",
  "의사 결정",
];

/**
 * 임시 점수 계산 함수 (답변 글자수 기반)
 * 실제 서비스에서는 서버/알고리즘 점수로 교체하면 됨
 */
function naiveScoreFromAnswers(answers: Record<string, string>) {
  const vals = Object.values(answers ?? {});
  const totalLen = vals.reduce((acc, t) => acc + (t?.trim().length ?? 0), 0);
  const cnt = vals.length || 1;
  const avgLen = totalLen / cnt;
  const base = Math.min(100, Math.round((avgLen / 120) * 100));

  return categories.map((_, i) =>
    Math.max(0, Math.min(100, base + ((i * 7) % 15) - 7))
  );
}

export default function CaseAnalysisPage() {
  const location = useLocation();
  const nav = useNavigate();
  const state = (location.state ?? null) as AnalysisState | null;

  // state가 없으면 결과 페이지로 돌려보냄 (주소창 직접 접근 방지)
  if (!state) return <Navigate to="/result" replace />;

  // 점수 계산
  const recent = useMemo(
    () => naiveScoreFromAnswers(state.answers),
    [state.answers]
  );
  const first = useMemo(
    () =>
      recent.map((v, idx) =>
        Math.max(0, Math.min(100, v - (idx % 2 ? 8 : 12)))
      ),
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

  // 평균/차이
  const avgFirst = Math.round(first.reduce((a, b) => a + b, 0) / first.length);
  const avgRecent = Math.round(
    recent.reduce((a, b) => a + b, 0) / recent.length
  );
  const avgDelta = avgRecent - avgFirst;

  // 개선/약화 항목
  const deltas = categories.map((c, i) => ({
    name: c,
    diff: (recent[i] ?? 0) - (first[i] ?? 0),
  }));
  const improved = [...deltas].sort((a, b) => b.diff - a.diff).slice(0, 2);
  const weakened = [...deltas].sort((a, b) => a.diff - b.diff).slice(0, 1);

  return (
    <div className="cap-root">
      <section className="cap-card">
        <header className="cap-header">
          <h1>추리 결과 분석</h1>
          <p className="cap-sub">
            선택한 범인: <b>{state.culpritId}</b>
          </p>
        </header>

        {/* 요약 KPI */}
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

        {/* 인사이트 */}
        <section className="cap-insights">
          <div className="cap-panel">
            <h3>개선이 큰 항목</h3>
            <ul>
              {improved.map((x) => (
                <li key={x.name}>
                  <b>{x.name}</b>: {x.diff > 0 ? `+${x.diff}` : x.diff}점
                </li>
              ))}
            </ul>
          </div>
          <div className="cap-panel">
            <h3>보완이 필요한 항목</h3>
            <ul>
              {weakened.map((x) => (
                <li key={x.name}>
                  <b>{x.name}</b>: {x.diff > 0 ? `+${x.diff}` : x.diff}점
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 권장 액션 */}
        <section className="cap-feedback">
          <h3>권장 액션</h3>
          <ul>
            <li>
              <b>시간 관리</b>: 제한시간 중간 시점에 “가설 검증 질문”
              체크리스트를 의식적으로 실행.
            </li>
            <li>
              <b>정보 수집</b>: 중복 질문 방지를 위해 “확정된 팩트”를 상단
              메모패널에 고정.
            </li>
            <li>
              <b>의심 탐지</b>: <i>장소×시간×인물</i> 3축 교차검증 템플릿을
              습관화.
            </li>
          </ul>
        </section>

        {/* 제출 답변 미리보기 */}
        <section className="cap-feedback" style={{ marginTop: 12 }}>
          <h3>제출한 답변(미리보기)</h3>
          <ul>
            {Object.entries(state.answers).map(([qid, ans]) => (
              <li key={qid}>
                <b>{qid}</b>: {ans || "(비어 있음)"}
              </li>
            ))}
          </ul>
        </section>

        {/* ✅ 종료하기 버튼 */}
        <div className="cap-actions">
          <button className="cap-exit-btn" onClick={() => nav("/scenarios")}>
            종료하기
          </button>
        </div>
      </section>
    </div>
  );
}
