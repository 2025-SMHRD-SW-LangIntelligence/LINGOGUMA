import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";
import { useAuth } from "@/store/auth.store";
import { useNavigate } from "react-router-dom";
import "@/shared/styles/MyPage.css";

interface GameResult {
    resultId: number;
    scenIdx: number;
    answerJson: any;
    skillsJson: {
        logic: number;
        creativity: number;
        focus: number;
        diversity: number;
        depth: number;
    };
    correct: boolean;
}

export default function GameHistoryPage() {
    const { user } = useAuth();
    const [results, setResults] = useState<GameResult[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const res = await api.get<GameResult[]>("/game-results/me");
                setResults(res.data);
            } catch (err) {
                console.error("게임 기록 불러오기 실패:", err);
            }
        };
        if (user) fetchResults();
    }, [user]);

    if (!user) {
        return <p className="form-error">로그인이 필요합니다.</p>;
    }

    return (
        <section>
            <h3 className="mypage-section-title">내 게임 기록</h3>

            {results.length === 0 ? (
                <p className="empty-msg">게임 기록이 없습니다.</p>
            ) : (
                <div className="history-list">
                    {results.map((r) => (
                        <div
                            key={r.resultId}
                            className="history-card"
                            onClick={() =>
                                navigate(`/my/game-result/${r.resultId}`, {
                                    state: r,
                                })
                            }
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    navigate(`/my/game-result/${r.resultId}`, {
                                        state: r,
                                    });
                                }
                            }}
                        >
                            <div className="history-card-header">
                                <span className="history-title">
                                    시나리오 {r.scenIdx}
                                </span>
                                <span
                                    className={`badge ${
                                        r.correct
                                            ? "badge-success"
                                            : "badge-fail"
                                    }`}
                                >
                                    {r.correct ? "정답" : "오답"}
                                </span>
                            </div>
                            <div className="history-card-body">
                                <p>
                                    범인 추리:{" "}
                                    {r.answerJson?.culprit ?? "미입력"}
                                </p>
                                <p>
                                    능력치 평균:{" "}
                                    {Math.round(
                                        (r.skillsJson.logic +
                                            r.skillsJson.creativity +
                                            r.skillsJson.focus +
                                            r.skillsJson.diversity +
                                            r.skillsJson.depth) /
                                            5
                                    )}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
