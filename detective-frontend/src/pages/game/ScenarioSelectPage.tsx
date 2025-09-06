// [ScenarioSelectPage.tsx]
import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/auth.store";
import { api } from "@/shared/api/client";
import "@/shared/styles/ScenarioSelectPage.css";

import bg from "@/assets/images/background.jpg";
import folder from "@/assets/images/folder.png";
import tutoImg from "@/assets/images/effects/tuto.png";
import star from "@/assets/images/icons/star.png";

/* =========================
   타입
   ========================= */
interface Scenario {
  scenIdx: number;
  scenTitle: string;
  scenLevel: number;
  scenAccess: "FREE" | "MEMBER";
}

/* =========================
   컴포넌트
   ========================= */
export default function ScenarioSelectPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const isAuthed = !!user;

  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  /* 힌트 토스트 */
  const [hint, setHint] = useState<string | null>(null);
  const hideTimer = useRef<number | null>(null);

  /* 게임 방법 모달 */
  const [howtoOpen, setHowtoOpen] = useState(false);

  /* 확대/이동 상태 */
  const [zoom, setZoom] = useState(1); // 1 ~ 4
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  /* =========================
     시나리오 목록 불러오기
     ========================= */
  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const res = await api.get<Scenario[]>("/scenarios");
        setScenarios(res.data);
      } catch (err) {
        console.error("시나리오 목록 불러오기 실패:", err);
      }
    };
    fetchScenarios();
  }, []);

  /* =========================
     세션 시작 → 지금은 SummaryPage로 이동
     ========================= */
  const handleStart = async (s: Scenario) => {
    if (s.scenAccess === "MEMBER" && !user?.userIdx) {
      showHint("로그인이 필요한 시나리오입니다.");
      nav("/login");
      return;
    }
    nav(`/scenarios/${s.scenIdx}/summary`);
  };

  /* =========================
     힌트 토스트 제어
     ========================= */
  const showHint = (msg: string) => {
    setHint(msg);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(
      () => setHint(null),
      2000
    ) as unknown as number;
  };
  useEffect(
    () => () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    },
    []
  );

  /* =========================
     게임 방법 오버레이 핸들러
     ========================= */
  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const onOverlayWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = Math.exp(delta * 0.0015);
    setZoom((z) => clamp(z * factor, 1, 4));
  };
  const onOverlayDblClick = () => {
    setZoom((z) => (z > 1 ? 1 : 2));
    setPan({ x: 0, y: 0 });
  };
  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (zoom <= 1) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, ox: pan.x, oy: pan.y };
  };
  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panStart.current.ox + dx, y: panStart.current.oy + dy });
  };
  const onMouseUpOrLeave = () => {
    isPanning.current = false;
  };

  /* =========================
     Esc 키로 게임 방법 닫기
     ========================= */
  useEffect(() => {
    if (!howtoOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setHowtoOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [howtoOpen]);

  /* =========================
     닉네임/아바타 텍스트
     ========================= */
  const nickname = useMemo(
    () => user?.nickname ?? String(user?.userIdx ?? "게스트"),
    [user]
  );

  /* =========================
     난이도 별 렌더링
     ========================= */
  const renderStars = (level: number) => {
    if (!level || level < 0) level = 0;
    return (
      <span className="sc-card__stars" aria-hidden="true">
        {Array.from({ length: level }).map((_, i) => (
          <img
            key={i}
            src={star}
            alt=""
            className="sc-card__star"
            draggable={false}
          />
        ))}
      </span>
    );
  };

  /* =========================
     렌더
     ========================= */
  return (
    <div
      className="sc-root"
      style={{
        minHeight: "100dvh",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* 우상단 고정 아바타 버튼 */}
      <button
        type="button"
        className="sc-avatar sc-avatar-fixed"
        onClick={() => {
          if (isAuthed) nav("/my/account");
          else nav("/login");
        }}
        aria-label={isAuthed ? `${nickname} 마이페이지로 이동` : "로그인 필요"}
        title={isAuthed ? "마이페이지" : "로그인"}
      >
        <span className="sc-avatar__initial">{nickname?.[0] ?? "G"}</span>
        <span className="sc-avatar__name">{nickname}</span>
      </button>

      {/* 제목 + 툴바 */}
      <div className="sc-wrap">
        <h1 className="sc-title">사건 의뢰서</h1>
        <div className="sc-toolbar">
          <button
            type="button"
            className="sc-howto-btn"
            onClick={() => {
              setHowtoOpen(true);
              resetZoom();
            }}
            aria-haspopup="dialog"
            aria-controls="howto-dialog"
            title="게임 방법"
          >
            게임 방법
          </button>
        </div>

        {/* 사건 목록 보드 */}
        <section className="sc-board" aria-label="사건 목록">
          <div className="sc-grid">
            {scenarios.map((s) => {
              const locked = s.scenAccess === "MEMBER" && !user?.userIdx;
              return (
                <div
                  key={s.scenIdx}
                  className={`sc-card ${locked ? "is-locked" : ""}`}
                >
                  <button
                    type="button"
                    className="sc-card__btn"
                    onClick={() => handleStart(s)}
                    aria-label={
                      locked ? `${s.scenTitle} (잠김)` : `${s.scenTitle} 시작`
                    }
                    aria-disabled={locked}
                  >
                    <img
                      src={folder}
                      alt=""
                      aria-hidden="true"
                      className="sc-card__bg"
                    />
                    <span className="sc-card__title">{s.scenTitle}</span>
                    {locked && (
                      <span className="sc-card__lock" aria-hidden="true">
                        🔒
                      </span>
                    )}
                  </button>

                  {/* 난이도: 별 아이콘으로 표시 */}
                  <div
                    className="sc-card__stars"
                    aria-label={`난이도 ${s.scenLevel}`}
                    title={`난이도: ${s.scenLevel}`}
                  >
                    {renderStars(s.scenLevel)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 게임 방법 오버레이 */}
      {howtoOpen && (
        <div
          className="howto-overlay"
          role="dialog"
          aria-modal="true"
          id="howto-dialog"
          aria-label="게임 방법"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
            zIndex: 9999,
            overflow: "hidden",
            touchAction: "none",
          }}
          onWheel={onOverlayWheel}
          onDoubleClick={onOverlayDblClick}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUpOrLeave}
          onMouseLeave={onMouseUpOrLeave}
        >
          <img
            src={tutoImg}
            alt="게임 방법 튜토리얼"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              display: "block",
              userSelect: "none",
              cursor:
                zoom > 1
                  ? isPanning.current
                    ? "grabbing"
                    : "grab"
                  : "zoom-in",
            }}
            draggable={false}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div
            onClick={() => setHowtoOpen(false)}
            style={{
              position: "fixed",
              top: "clamp(12px, 2.5vh, 28px)",
              right: "clamp(12px, 2.5vw, 28px)",
              color: "#fff",
              fontWeight: 900,
              fontSize: 24,
              padding: "10px 14px",
              borderRadius: 14,
              background: "rgba(161, 161, 161, 0.45)",
              border: "1px solid rgba(255,255,255,0.22)",
              cursor: "pointer",
            }}
            title="닫기 (Esc)"
            aria-label="닫기 (Esc)"
          >
            닫기 (ESC)
          </div>
        </div>
      )}

      {/* 힌트 토스트 */}
      {hint && (
        <div className="sc-hint" role="status" aria-live="polite">
          {hint}
        </div>
      )}
    </div>
  );
}
