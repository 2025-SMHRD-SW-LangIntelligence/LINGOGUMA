// src/pages/GamePlayPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../shared/api/client";
import { useScenario } from "../store/scenario.store";
import { useMemoStore } from "../store/memo.store";
import "./GamePlayPage.css";

/* ---------- 타입 ---------- */
type SpotlightCfg = {
  top?: number;
  widthPct?: number;
  heightPct?: number;
  angleDeg?: number;
  opacity?: number;
};

type PlaySuspect = {
  id: string;
  name: string;
  avatar: string;
  full?: string;
  comment?: string;
  facts?: string[]; // ✅ 추가
};

type ChatMessage = {
  id: string;
  from: "me" | "npc";
  whoId?: string;
  text: string;
};

type PlayConfig = {
  background?: string;
  suspects: PlaySuspect[];
  messages: ChatMessage[];
  timeLimitSec?: number;
  intro?: string;
  map?: string;
  spotlight?: SpotlightCfg;
};

/* ---------- 브리핑 전용 ---------- */
type BriefItem = PlaySuspect & {
  facts: string[];
  quote?: string;
};

/* ---------- 아이콘 ---------- */
type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const IconChatLeft = ({ size = 32, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...p}>
    <path
      d="M15 18l-6-6 6-6"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconChatRight = ({ size = 32, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...p}>
    <path
      d="M9 6l6 6-6 6"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ---------- 아이콘 경로 & 폴백 ---------- */
function iconSrc(name: string, ext: "svg" | "png" = "svg") {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const norm = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${norm}/icons/${name}.${ext}`;
}
const onIconError: React.ReactEventHandler<HTMLImageElement> = (e) => {
  const img = e.currentTarget;
  if (img.src.endsWith(".svg")) {
    img.src = img.src.replace(/\.svg$/, ".png");
  } else {
    img.style.visibility = "hidden";
  }
};

/* ---------- 이미지 경로 보정 ---------- */
function resolveURL(p?: string): string | undefined {
  if (!p) return undefined;
  if (/^https?:\/\//i.test(p)) return p;
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const normBase = base.endsWith("/") ? base.slice(0, -1) : base;

  if (p.startsWith("/")) return `${normBase}${p}`;
  if (p.startsWith("avatars/")) return `${normBase}/${p}`;
  return `${normBase}/avatars/${p}`;
}

/* ---------- 유틸 ---------- */
function normalizeToObject(raw: unknown) {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw !== null && typeof raw === "object" ? (raw as object) : null;
}
function shapeSuspects(input: any[]): PlaySuspect[] {
  return (input ?? []).map((s: any) => ({
    id: String(s?.id ?? ""),
    name: String(s?.name ?? ""),
    avatar: String(s?.avatar ?? ""),
    full: s?.full ? String(s.full) : undefined,
    comment: s?.comment ? String(s.comment) : undefined,
    facts: Array.isArray(s?.facts)
      ? (s.facts as any[]).map((x) => String(x))
      : undefined, // ✅ JSON facts 반영
  }));
}
function shapeMessages(input: any[]): ChatMessage[] {
  return (input ?? []).map((m: any) => ({
    id: String(m?.id ?? `m-${Math.random()}`),
    from: (m?.from === "me" ? "me" : "npc") as "me" | "npc",
    whoId: m?.whoId != null ? String(m.whoId) : undefined,
    text: String(m?.text ?? ""),
  }));
}

/** API → /mock/:id-play.json → /mock/:id.json → 폴백 */
async function loadPlayConfig(id: string): Promise<PlayConfig> {
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const join = (p: string) =>
    (base.endsWith("/") ? base.slice(0, -1) : base) +
    (p.startsWith("/") ? p : `/${p}`);

  try {
    const res = await api.get(`/api/scenarios/${id}/play-config`);
    const obj = normalizeToObject(res.data) as any;
    if (obj) {
      return {
        background: obj.background ?? undefined,
        suspects: shapeSuspects(obj.suspects ?? []),
        messages: shapeMessages(obj.messages ?? []),
        timeLimitSec: Number.isFinite(obj.timeLimitSec)
          ? obj.timeLimitSec
          : 10 * 60 + 36,
        intro: obj.intro ?? undefined,
        map: obj.map ?? undefined,
        spotlight: obj.spotlight ?? undefined,
      };
    }
  } catch {}
  try {
    const r = await fetch(join(`mock/${id}-play.json`), { cache: "no-store" });
    if (r.ok) {
      const obj = (await r.json()) as any;
      return {
        background: obj.background ?? undefined,
        suspects: shapeSuspects(obj.suspects ?? []),
        messages: shapeMessages(obj.messages ?? []),
        timeLimitSec: Number.isFinite(obj.timeLimitSec)
          ? obj.timeLimitSec
          : 10 * 60 + 36,
        intro: obj.intro ?? undefined,
        map: obj.map ?? undefined,
        spotlight: obj.spotlight ?? undefined,
      };
    }
  } catch {}
  try {
    const r2 = await fetch(join(`mock/${id}.json`), { cache: "no-store" });
    if (r2.ok) {
      const baseObj = (await r2.json()) as any;
      return {
        background: baseObj?.background ?? "/assets/background.jpg",
        suspects: shapeSuspects(baseObj?.suspects ?? []),
        messages: [],
        timeLimitSec: 10 * 60 + 36,
        intro: baseObj?.intro ?? undefined,
        map: baseObj?.map ?? undefined,
        spotlight: baseObj?.spotlight ?? undefined,
      };
    }
  } catch {}
  return {
    background: "/assets/background.jpg",
    suspects: [],
    messages: [],
    timeLimitSec: 10 * 60 + 36,
    intro: "사건 개요를 불러올 수 없습니다.",
  };
}

export default function GamePlayPage() {
  const nav = useNavigate();
  const { scenarioId: scenarioIdInUrl } = useParams<{ scenarioId: string }>();

  const currentScenarioId = useScenario((s) => s.currentScenarioId);
  const setCurrentScenarioId = useScenario((s) => s.setCurrentScenarioId);

  // URL → store 1회 동기화
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!syncedRef.current && scenarioIdInUrl) {
      syncedRef.current = true;
      setCurrentScenarioId(scenarioIdInUrl);
    }
  }, [scenarioIdInUrl, setCurrentScenarioId]);

  const { data } = useQuery({
    queryKey: ["play-config", currentScenarioId],
    enabled: !!currentScenarioId,
    queryFn: () => loadPlayConfig(currentScenarioId!),
    staleTime: 5 * 60 * 1000,
  });

  const suspects = useMemo(() => data?.suspects ?? [], [data]);

  /** ‘대상(전송)’과 ‘보기(필터)’ 분리 */
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  // 입장 시 1회: 첫 번째 용의자 필터
  const viewInitRef = useRef(false);
  useEffect(() => {
    if (viewInitRef.current) return;
    if (suspects.length > 0) {
      setViewId(suspects[0].id);
      viewInitRef.current = true;
    }
  }, [suspects]);

  const [chatOpen, setChatOpen] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);

  // 타이머
  useEffect(() => {
    const t = window.setInterval(() => setElapsedSec((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  // 메모
  const [memoOpen, setMemoOpen] = useState(false);
  const memoText = useMemoStore((s) => s.text);
  const setMemoText = useMemoStore((s) => s.setText);
  const clearMemo = useMemoStore((s) => s.clear);

  // 사건 개요
  const [overviewOpen, setOverviewOpen] = useState(false);

  // 메모창 드래그
  const [memoPos, setMemoPos] = useState({ x: 20, y: 80 });
  const memoRef = useRef<HTMLDivElement | null>(null);
  const dragData = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const onDragStart = (e: React.MouseEvent) => {
    if (!memoRef.current) return;
    dragData.current = {
      offsetX: e.clientX - memoPos.x,
      offsetY: e.clientY - memoPos.y,
    };
    document.addEventListener("mousemove", onDragging);
    document.addEventListener("mouseup", onDragEnd);
  };
  const onDragging = (e: MouseEvent) => {
    if (!dragData.current) return;
    setMemoPos({
      x: e.clientX - dragData.current.offsetX,
      y: e.clientY - dragData.current.offsetY,
    });
  };
  const onDragEnd = () => {
    dragData.current = null;
    document.removeEventListener("mousemove", onDragging);
    document.removeEventListener("mouseup", onDragEnd);
  };

  // comment 프리로드
  useEffect(() => {
    if (!data) return;
    const baseMsgs: ChatMessage[] = [];
    for (const s of data.suspects ?? []) {
      if (s.comment) {
        baseMsgs.push({
          id: `c-${s.id}`,
          from: "npc",
          whoId: s.id,
          text: s.comment,
        });
      }
    }
    setMsgs([...baseMsgs, ...(data.messages ?? [])]);
    setActiveId((data.suspects && data.suspects[0]?.id) || null);
  }, [data]);

  // 우측 리스트 스크롤
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, activeId, viewId]);
  useEffect(() => {
    if (chatOpen)
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
  }, [chatOpen]);

  // 최근 메시지 맵
  const lastById = useMemo(() => {
    const map: Record<string, ChatMessage> = {};
    for (const m of msgs) {
      const key = m.whoId || "";
      if (!key) continue;
      map[key] = m;
    }
    return map;
  }, [msgs]);

  // 필터링된 메시지
  const filterId = viewId;
  const visibleMsgs = useMemo(() => {
    if (!filterId) return msgs;
    return msgs.filter((m) => !m.whoId || m.whoId === filterId);
  }, [msgs, filterId]);

  /* ========================= 무대 말풍선 ========================= */
  const BUBBLE_MS = 2200;
  const [stageBubble, setStageBubble] = useState<{
    whoId: string;
    text: string;
  } | null>(null);
  const bubbleTimer = useRef<number | null>(null);
  const showNpcBubble = (whoId: string, text: string) => {
    setStageBubble({ whoId, text });
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(
      () => setStageBubble(null),
      BUBBLE_MS
    ) as unknown as number;
  };
  useEffect(
    () => () => {
      if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    },
    []
  );

  // 전송
  const send = () => {
    const text = input.trim();
    if (!text) return;
    if (!activeId) return alert("대화할 인물을 먼저 선택하세요.");

    setMsgs((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, from: "me", whoId: activeId, text },
    ]);
    setInput("");

    window.setTimeout(() => {
      const reply = "…계속 조사 중입니다.";
      setMsgs((prev) => [
        ...prev,
        { id: `r-${Date.now()}`, from: "npc", whoId: activeId, text: reply },
      ]);
      showNpcBubble(activeId, reply);
    }, 500);
  };
  const onEnter: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  };

  const goToResult = () => nav("/result");

  if (!currentScenarioId) {
    return (
      <div style={{ color: "#fff", padding: 24 }}>
        시나리오를 먼저 선택하세요.{" "}
        <button onClick={() => nav("/scenarios")}>목록으로</button>
      </div>
    );
  }

  // 스포트라이트 변수
  const sp = data?.spotlight ?? {};
  const w = (sp.widthPct ?? 1.6) * 100;
  const h = (sp.heightPct ?? 1.9) * 100;
  const topRatio = sp.top ?? -0.28;
  const ang = sp.angleDeg ?? 18;
  const op = sp.opacity ?? 0.9;

  /* ========================= 브리핑(입장 1회) ========================= */
  const briefList: BriefItem[] = useMemo(() => {
    return (suspects ?? [])
      .map((s) => {
        const facts = Array.isArray(s.facts)
          ? s.facts.map((x) => String(x))
          : [];
        const quote = (s.comment ?? "").trim();
        return { ...s, facts, quote };
      })
      .filter((b) => b.quote || b.facts.length > 0);
  }, [suspects]);

  const [briefOpen, setBriefOpen] = useState(false);
  const [briefIdx, setBriefIdx] = useState(0);
  const briefInitRef = useRef(false);

  useEffect(() => {
    if (briefInitRef.current) return;
    if (briefList.length > 0) {
      setBriefOpen(true);
      setBriefIdx(0);
      briefInitRef.current = true;
    }
  }, [briefList]);

  const currentBrief = briefList[briefIdx];
  const briefFacts = currentBrief?.facts ?? [];
  const briefQuote = currentBrief?.quote ?? "";
  const briefImgSrc =
    resolveURL(currentBrief?.full ?? currentBrief?.avatar) ||
    resolveURL("placeholder-full.png")!;

  const closeBrief = () => setBriefOpen(false);
  const nextBrief = () => {
    if (briefIdx < briefList.length - 1) setBriefIdx((i) => i + 1);
    else closeBrief();
  };
  const prevBrief = () => {
    if (briefIdx > 0) setBriefIdx((i) => i - 1);
  };

  return (
    <div
      className={`play-root ${chatOpen ? "has-chat-open" : ""}`}
      style={{
        backgroundImage: `url(${data?.background ?? "/assets/background.jpg"})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* 좌상단 타이머 */}
      <button className="timer-badge" onClick={goToResult}>
        심문 종료 ({mm}:{ss})
      </button>

      {/* 브리핑 오버레이 */}
      {briefOpen && currentBrief && (
        <div
          className="brief-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="용의자 설명"
        >
          <div className="brief-dim" />

          <div className="brief-panel">
            <div
              className="brief-figure"
              style={{ ["--brief-img" as any]: `url(${briefImgSrc})` }}
            >
              <img
                src={briefImgSrc}
                alt={currentBrief.name}
                onError={(e) =>
                  (e.currentTarget.src = resolveURL("placeholder-full.png")!)
                }
              />
            </div>

            <div className="brief-text">
              <h2 className="brief-title">{currentBrief.name}</h2>

              {briefFacts.length > 0 && (
                <ul className="brief-facts">
                  {briefFacts.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}

              {briefQuote && <p className="brief-quote">{briefQuote}</p>}
            </div>
          </div>

          {/* 오른쪽 아래 내비 */}
          <div className="brief-navs">
            {/* 좌우 사이드 내비 (가운데 높이에 배치) */}
            <button
              type="button"
              className="brief-sidenav prev fab-like"
              onClick={prevBrief}
              aria-label="이전"
              title="이전"
            >
              <IconChatLeft />
            </button>

            <button
              type="button"
              className="brief-sidenav next fab-like"
              onClick={nextBrief}
              aria-label="다음"
              title="다음"
            >
              <IconChatRight />
            </button>
          </div>
        </div>
      )}

      {/* 좌측 도구 (이미지 아이콘) */}
      <div className="tools">
        <button
          className={`tool-btn ${overviewOpen ? "is-on" : ""}`}
          title="사건 개요"
          aria-pressed={overviewOpen}
          onClick={() => setOverviewOpen((v) => !v)}
        >
          <img
            className="icon"
            src={iconSrc("summary", "svg")}
            alt=""
            aria-hidden="true"
            onError={onIconError}
          />
        </button>

        <button
          className={`tool-btn ${memoOpen ? "is-on" : ""}`}
          title="메모장"
          aria-pressed={memoOpen}
          onClick={() => setMemoOpen((v) => !v)}
        >
          <img
            className="icon"
            src={iconSrc("memo", "svg")}
            alt=""
            aria-hidden="true"
            onError={onIconError}
          />
        </button>
      </div>

      {/* 사건 개요 팝업 */}
      {overviewOpen && (
        <div className="overview-popup">
          <div className="overview-header">
            사건 개요 & 지도
            <button
              className="icon-close"
              onClick={() => setOverviewOpen(false)} // ← 클릭 시 팝업 닫힘
              aria-label="닫기"
              title="닫기"
            >
              <img
                className="icon"
                src={iconSrc("close", "svg")} // ← /icons/close.svg 아이콘 사용
                alt=""
                aria-hidden="true"
                onError={onIconError} // ← svg 실패 시 png로 폴백
              />
            </button>
          </div>

          <div className="overview-body">
            <h3>사건 개요</h3>
            <p>{data?.intro ?? "시나리오 개요가 없습니다."}</p>

            <h3>지도</h3>
            {data?.map ? (
              <img
                src={data.map}
                alt="시나리오 지도"
                style={{ width: "100%", borderRadius: "8px" }}
              />
            ) : (
              <p>시나리오 지도 없음</p>
            )}
          </div>
        </div>
      )}

      {/* 메모 팝업 */}
      {memoOpen && (
        <div
          ref={memoRef}
          className="memo-popup"
          style={{ top: memoPos.y, left: memoPos.x }}
        >
          <div className="memo-header" onMouseDown={onDragStart}>
            📝 메모장
          </div>
          <textarea
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            placeholder="메모를 입력하세요..."
          />
          <div className="memo-actions">
            <button onClick={() => setMemoOpen(false)}>닫기</button>
            <button onClick={clearMemo}>초기화</button>
          </div>
        </div>
      )}

      {/* 중앙 무대 */}
      <div className="stage">
        {suspects.slice(0, 4).map((s) => {
          const sel = s.id === activeId;
          const last = lastById[s.id];

          return (
            <button
              key={s.id}
              type="button"
              className={`actor-btn ${sel ? "is-active" : ""}`}
              onClick={() => {
                setActiveId(s.id);
                const text =
                  last && last.from === "npc"
                    ? last.text
                    : s.comment ?? "무엇을 물어볼까요?";
                showNpcBubble(s.id, text);
              }}
              aria-pressed={sel}
              title={`${s.name} 대화하기`}
            >
              {sel && (
                <div
                  className="spotlight-cone"
                  aria-hidden
                  style={
                    {
                      "--cone-w": `${w}%`,
                      "--cone-h": `${h}%`,
                      "--cone-top": `${topRatio * 100}%`,
                      "--cone-angle": `${ang}deg`,
                      "--cone-opacity": op,
                    } as React.CSSProperties
                  }
                />
              )}

              {stageBubble && stageBubble.whoId === s.id && (
                <div className="actor-bubble">{stageBubble.text}</div>
              )}

              {s.full ? (
                <img
                  className="actor-full"
                  src={resolveURL(s.full)}
                  alt={s.name}
                  onError={(e) =>
                    (e.currentTarget.src = resolveURL("placeholder-full.png")!)
                  }
                />
              ) : (
                <div className="actor-avatar">
                  <img
                    src={resolveURL(s.avatar)}
                    alt={s.name}
                    onError={(e) =>
                      (e.currentTarget.src = resolveURL("placeholder.png")!)
                    }
                  />
                </div>
              )}
              <span className="actor-name">{s.name}</span>
            </button>
          );
        })}
      </div>

      {/* 오른쪽 대화 패널 */}
      <aside className={`chat-panel ${chatOpen ? "" : "is-closed"}`}>
        {/* 1) 용의자 선택(아바타) */}
        <div className="chat-avatars">
          {suspects.map((s) => {
            const viewing = viewId != null && s.id === viewId;
            return (
              <button
                key={s.id}
                className={`chat-ava ${viewing ? "is-active" : ""}`}
                onClick={() => setViewId(s.id)}
                title={`${s.name} 대화 내역 보기`}
                aria-pressed={viewing}
                aria-label={`${s.name} 대화 내역 보기`}
              >
                <img
                  src={resolveURL(s.avatar)}
                  alt={s.name}
                  onError={(e) =>
                    (e.currentTarget.src = resolveURL("placeholder.png")!)
                  }
                />
                <span className="chat-ava-name">{s.name}</span>
              </button>
            );
          })}
        </div>

        {/* 2) 선택된 용의자의 FACTS (없으면 섹션 자체 미노출) */}
        {(() => {
          const selected = suspects.find((s) => s.id === viewId);
          const facts = selected?.facts?.filter(Boolean) ?? [];
          if (facts.length === 0) return null;
          return (
            <div className="chat-facts" aria-live="polite">
              <ul>
                {facts.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* 3) 대화 내역 */}
        <div id="chat-body" className="chat-list" ref={listRef}>
          {visibleMsgs.map((m) => (
            <div key={m.id} className={`bubble ${m.from}`}>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* 대화창 토글 FAB */}
      <button
        type="button"
        className="chat-fab"
        onClick={() => setChatOpen((v) => !v)}
        aria-expanded={chatOpen}
        aria-controls="chat-body"
        aria-label={chatOpen ? "대화창 닫기" : "대화창 열기"}
        title={chatOpen ? "대화창 닫기" : "대화창 열기"}
      >
        {chatOpen ? <IconChatRight /> : <IconChatLeft />}
      </button>

      {/* 입력창 */}
      <div className="input-dock">
        <input
          className="input"
          placeholder="// 이곳에 텍스트를 입력하세요"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onEnter}
        />
        <button className="send-btn" onClick={send}>
          보내기
        </button>
      </div>
    </div>
  );
}
