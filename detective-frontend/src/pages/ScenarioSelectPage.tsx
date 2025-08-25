import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth.store";
import "./ScenarioSelectPage.css";
import folder from "../assets/folder.png";
import { SCENARIOS, Scenario } from "../shared/types/case"; // ✅ case.ts에서 불러오기

export default function ScenarioSelectPage() {
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const isAuthed = !!user;
  const unlockedCount = isAuthed ? SCENARIOS.length : 1;

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
    if (idx < unlockedCount) nav(`/scenarios/${s.id}`); // ✅ 개요 페이지로 이동
    else showHint("로그인하면 모든 사건을 플레이할 수 있어요.");
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
