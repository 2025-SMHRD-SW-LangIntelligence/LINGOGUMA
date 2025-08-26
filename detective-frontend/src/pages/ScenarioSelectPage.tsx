import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth.store";
import { useScenario } from "../store/scenario.store";
import "./ScenarioSelectPage.css";
import folder from "../assets/folder.png";

type Scenario = { id: string; title: string };

const SCENARIOS: Scenario[] = [
  { id: "s1", title: "도서관에서 사라진 고서" },
  { id: "s2", title: "밀실의 마지막 실험" },
  { id: "s3", title: "사라진 연구 노트" },
  { id: "s4", title: "새벽 3시의 전화" },
  { id: "s5", title: "유리창에 남은 손자국" },
  { id: "s6", title: "검은 봉투의 의뢰" },
  { id: "s7", title: "25언어지능 대장의 비밀" },
  { id: "s8", title: "아이스티 먹으면 꿀잠자는 그녀" },
  { id: "s9", title: "큰언니의 반란" },
  { id: "s10", title: "문세인업데 일해라" },
];

export default function ScenarioSelectPage() {
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const isAuthed = !!user;
  const unlockedCount = isAuthed ? SCENARIOS.length : 1;

  const setCurrentScenarioId = useScenario((s) => s.setCurrentScenarioId);

  const [hint, setHint] = useState<string | null>(null);
  const hideTimer = useRef<number | null>(null);

  const showHint = (msg: string) => {
    setHint(msg);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(
      () => setHint(null),
      2000
    ) as unknown as number;
  };

  const onClickAvatar = () => {
    if (isAuthed) nav("/me");
    else {
      showHint("로그인이 필요합니다.");
      nav("/login");
    }
  };

  const onClickCard = (s: Scenario, idx: number) => {
    if (idx < unlockedCount) {
      setCurrentScenarioId(s.id); // ✅ 전역 저장
      nav(`/play/${s.id}/summary`); // ✅ 요약으로 이동
    } else {
      showHint("로그인하면 모든 사건을 플레이할 수 있어요.");
    }
  };

  const onKeyPressCard = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    s: Scenario,
    i: number
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClickCard(s, i);
    }
  };

  const nickname = useMemo(
    () => user?.nickname ?? user?.id ?? "게스트",
    [user]
  );

  useEffect(
    () => () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    },
    []
  );

  return (
    <div className="sc-root">
      {/* 우상단 고정 아바타 버튼 */}
      <button
        type="button"
        className="sc-avatar sc-avatar-fixed"
        onClick={onClickAvatar}
        aria-label={isAuthed ? `${nickname} 마이페이지로 이동` : "로그인 필요"}
        title={isAuthed ? "마이페이지" : "로그인"}
      >
        <span className="sc-avatar__initial">{nickname?.[0] ?? "G"}</span>
        <span className="sc-avatar__name">{nickname}</span>
      </button>

      {/* 제목 + 보드 */}
      <div className="sc-wrap">
        <h1 className="sc-title">사건 의뢰서</h1>

        <section className="sc-board" aria-label="사건 목록">
          <div className="sc-grid">
            {SCENARIOS.map((s, i) => {
              const locked = i >= unlockedCount;
              return (
                <div
                  key={s.id}
                  className={`sc-card ${locked ? "is-locked" : ""}`}
                >
                  <button
                    type="button"
                    className="sc-card__btn"
                    onClick={() => onClickCard(s, i)}
                    onKeyDown={(e) => onKeyPressCard(e, s, i)}
                    aria-label={
                      locked ? `${s.title} (잠김)` : `${s.title} 시작`
                    }
                    aria-disabled={locked}
                  >
                    <img
                      src={folder}
                      alt=""
                      aria-hidden="true"
                      className="sc-card__bg"
                    />
                    <span className="sc-card__title">{s.title}</span>
                    {locked && (
                      <span className="sc-card__lock" aria-hidden="true">
                        🔒
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {hint && (
        <div className="sc-hint" role="status" aria-live="polite">
          {hint}
        </div>
      )}
    </div>
  );
}
