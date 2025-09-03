import { useEffect, useState, useMemo } from "react";
import {
    useLocation,
    useNavigate,
    useParams,
    Navigate,
} from "react-router-dom";
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
    answerJson: { culprit?: string; when?: string; how?: string; why?: string };
    skillsJson: Skills;
};

/* =========================
   카테고리 (팀원 UI 기준)
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

    const [culprit, setCulprit] = useState<string>("");
    const [isCorrect, setIsCorrect] = useState<boolean>(false);
    const [skills, setSkills] = useState<Skills>({
        logic: 0,
        creativity: 0,
        focus: 0,
        diversity: 0,
        depth: 0,
    });
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    /* =========================
     API 호출
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
                const res = await api.get<GameResultDTO>(
                    `/game-results/${resultId}`
                );
                const data = res.data;
                const sj: any = data.skillsJson || {};

                setCulprit(data.answerJson?.culprit || "");
                setIsCorrect(Boolean(data.correct));
                setAnswers(data.answerJson || {});
                setSkills({
                    logic: Number(sj.logic ?? 0),
                    creativity: Number(sj.creativity ?? 0),
                    focus: Number(sj.focus ?? 0),
                    diversity: Number(sj.diversity ?? 0),
                    depth: Number(sj.depth ?? 0),
                });
            } catch (err: any) {
                const status = err?.response?.status;
                if (status === 403)
                    setErrorMsg("이 결과를 볼 권한이 없습니다.");
                else if (status === 404)
                    setErrorMsg("결과를 찾을 수 없습니다.");
                else
                    setErrorMsg(
                        "결과 불러오기 실패. 잠시 후 다시 시도해주세요."
                    );
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [resultId]);

    /* =========================
     차트 데이터 구성
     ========================= */
    const recent = useMemo(() => {
        return [
            skills.logic,
            skills.creativity,
            skills.focus,
            skills.diversity,
            skills.depth,
        ];
    }, [skills]);

    // 비교용 더미 (첫 결과 = recent에서 임의로 -10)
    const first = useMemo(() => {
        return recent.map((v, idx) =>
            Math.max(0, v - (idx % 2 === 0 ? 8 : 12))
        );
    }, [recent]);

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
    const avgFirst = Math.round(
        first.reduce((a, b) => a + b, 0) / first.length
    );
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
                        선택한 범인: <b>{culprit || "미입력"}</b>
                    </p>
                    <p>{isCorrect ? "정답입니다" : "틀렸습니다 ❌"}</p>
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
                                    <PolarRadiusAxis
                                        angle={90}
                                        domain={[0, 100]}
                                        tickCount={6}
                                    />
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
                                    <PolarRadiusAxis
                                        angle={90}
                                        domain={[0, 100]}
                                        tickCount={6}
                                    />
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
                                    <b>{x.name}</b>:{" "}
                                    {x.diff > 0 ? `+${x.diff}` : x.diff}점
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="cap-panel">
                        <h3>보완이 필요한 항목</h3>
                        <ul>
                            {weakened.map((x) => (
                                <li key={x.name}>
                                    <b>{x.name}</b>:{" "}
                                    {x.diff > 0 ? `+${x.diff}` : x.diff}점
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* 제출 답변 */}
                <section className="cap-feedback" style={{ marginTop: 12 }}>
                    <h3>제출한 답변(미리보기)</h3>
                    <ul>
                        {Object.entries(answers).map(([k, v]) => (
                            <li key={k}>
                                <b>{k}</b>: {v || "(비어 있음)"}
                            </li>
                        ))}
                    </ul>
                </section>

                {/* 종료 버튼 */}
                <div className="cap-actions">
                    <button
                        className="cap-exit-btn"
                        onClick={() => nav("/scenarios")}
                    >
                        종료하기
                    </button>
                    {/* <button
                        className="cap-exit-btn"
                        onClick={() => nav(`/play/${scenarioId}`)}
                    >
                        다시 플레이
                    </button> */}
                </div>
            </section>
        </div>
    );
}
