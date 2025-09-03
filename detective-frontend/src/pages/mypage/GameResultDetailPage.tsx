// src/pages/mypage/GameResultDetailPage.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { Radar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from "chart.js";
import "@/shared/styles/MyPage.css";

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

export default function GameResultDetailPage() {
    const location = useLocation();
    const navigate = useNavigate();

    const result = location.state as any;
    if (!result) return <p className="form-error">결과 데이터가 없습니다.</p>;

    const { answerJson, skillsJson, correct } = result;

    const data = {
        labels: ["논리력", "창의력", "집중력", "다양성", "깊이"],
        datasets: [
            {
                label: "플레이어 능력치",
                data: [
                    skillsJson.logic,
                    skillsJson.creativity,
                    skillsJson.focus,
                    skillsJson.diversity,
                    skillsJson.depth,
                ],
                backgroundColor: "rgba(34, 202, 236, 0.25)",
                borderColor: "#22caec",
                borderWidth: 2,
                pointBackgroundColor: "#22caec",
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                angleLines: { color: "#ccc" },
                suggestedMin: 0,
                suggestedMax: 100,
                ticks: { stepSize: 20, color: "#ccc" },
                pointLabels: { color: "#eee", font: { size: 13 } },
                grid: { color: "#555" },
            },
        },
        plugins: {
            legend: { display: false },
        },
    };

    const avgScore = Math.round(
        (skillsJson.logic +
            skillsJson.creativity +
            skillsJson.focus +
            skillsJson.diversity +
            skillsJson.depth) /
            5
    );

    return (
        <div className="cap-root">
            <section className="cap-card">
                {/* 헤더 */}
                <header className="cap-header">
                    <h1>게임 기록 상세</h1>
                    <p className="cap-sub">
                        범인 추리: <b>{answerJson?.culprit ?? "미입력"}</b>
                    </p>
                    <p
                        className={`cap-result ${
                            correct ? "correct" : "wrong"
                        }`}
                    >
                        {correct ? "정답입니다" : "틀렸습니다 ❌"}
                    </p>
                </header>

                {/* KPI */}
                <section className="cap-kpis">
                    <div className="cap-kpi">
                        <div className="cap-kpi-label">평균 점수</div>
                        <div className="cap-kpi-value">{avgScore}</div>
                    </div>
                    <div className={`cap-kpi ${correct ? "pos" : "neg"}`}>
                        <div className="cap-kpi-label">정답 여부</div>
                        <div className="cap-kpi-value">
                            {correct ? "정답" : "오답"}
                        </div>
                    </div>
                </section>

                {/* 차트 */}
                <div className="cap-charts-row">
                    <article className="cap-chart-tile">
                        <h2>능력치 분석</h2>
                        <div className="cap-chart-area">
                            <Radar data={data} options={options} />
                        </div>
                    </article>
                </div>

                {/* 제출 답변 요약 */}
                <section className="cap-feedback">
                    <h3>제출한 답변</h3>
                    <ul>
                        <li>
                            <b>언제:</b> {answerJson?.when || "(미입력)"}
                        </li>
                        <li>
                            <b>어떻게:</b> {answerJson?.how || "(미입력)"}
                        </li>
                        <li>
                            <b>왜:</b> {answerJson?.why || "(미입력)"}
                        </li>
                    </ul>
                </section>

                {/* 버튼 */}
                <div className="cap-actions">
                    <button
                        className="cap-exit-btn"
                        onClick={() => navigate(-1)}
                    >
                        목록으로 돌아가기
                    </button>
                </div>
            </section>
        </div>
    );
}
