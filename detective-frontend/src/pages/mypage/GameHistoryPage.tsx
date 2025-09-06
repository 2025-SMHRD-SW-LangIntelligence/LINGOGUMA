import { useEffect, useState, useMemo } from "react";
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
  const [nameMaps, setNameMaps] = useState<
    Record<number, Record<string, string>>
  >({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.get<GameResult[]>("/game-results/me");
        const list = res.data ?? [];
        setResults(list);

        const maps: Record<number, Record<string, string>> = {};
        for (const r of list) {
          try {
            const scen = await api.get(`/scenarios/${r.scenIdx}`);
            let content: any = scen.data?.contentJson;
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
            const map: Record<string, string> = {};
            chars.forEach((c) => {
              if (c?.id && c?.name) map[String(c.id)] = String(c.name);
            });
            maps[r.scenIdx] = map;
          } catch {
            maps[r.scenIdx] = {};
          }
        }
        setNameMaps(maps);
      } catch (err) {
        console.error("게임 기록 불러오기 실패:", err);
      }
    };
    if (user) fetchResults();
  }, [user]);

  const isEmpty = useMemo(() => results.length === 0, [results]);

  if (!user) {
    return <p className="form-error">로그인이 필요합니다.</p>;
  }

  // 안전한 평균 계산
  const avgScore = (r: GameResult) => {
    const s = r.skillsJson ?? {};
    const vals = [
      Number(s.logic) || 0,
      Number(s.creativity) || 0,
      Number(s.focus) || 0,
      Number(s.diversity) || 0,
      Number(s.depth) || 0,
    ];
    return Math.round(vals.reduce((a, b) => a + b, 0) / 5);
  };

  const culpritText = (r: GameResult) => {
    const a = r.answerJson ?? {};
    const map = nameMaps[r.scenIdx] || {};
    if (typeof a.culprit === "string") {
      return map[a.culprit] || a.culprit || "미입력";
    }
    if (a.culprit && typeof a.culprit.name === "string") {
      return a.culprit.name;
    }
    return "미입력";
  };

  return (
    <section className="account-section">
      <h3 className="mypage-section-title">내 게임 기록</h3>

      {isEmpty ? (
        <p className="account-empty">게임 기록이 없습니다.</p>
      ) : (
        <div className="account-grid">
          {results.map((r) => (
            <div
              key={r.resultId}
              className="account-card clickable"
              role="button"
              tabIndex={0}
              onClick={() =>
                navigate(`/my/game-result/${r.resultId}`, { state: r })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  navigate(`/my/game-result/${r.resultId}`, { state: r });
                }
              }}
            >
              <div className="account-card-header">
                <span className="account-card-title">시나리오 {r.scenIdx}</span>
                <span
                  className={`badge ${
                    r.correct ? "badge-success" : "badge-fail"
                  }`}
                >
                  {r.correct ? "정답" : "오답"}
                </span>
              </div>

              <div className="account-card-body">
                <div className="account-profile-grid">
                  <div className="k">범인 추리</div>
                  <div className="v">{culpritText(r)}</div>

                  <div className="k">능력치 평균</div>
                  <div className="v">{avgScore(r)}점</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
