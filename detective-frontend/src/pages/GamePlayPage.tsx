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
  top?: number; // -0.28 (버튼 높이 대비 시작 y 비율)
  widthPct?: number; // 1.6  (버튼 폭 대비)
  heightPct?: number; // 1.9  (버튼 높이 대비)
  angleDeg?: number; // 18   (콘 각도)
  opacity?: number; // 0~1  (투명도)
};

type PlaySuspect = {
  id: string;
  name: string;
  avatar: string;
  full?: string;
  comment?: string;
  // scale?: number;
};

type ChatMessage = {
  id: string;
  from: "me" | "npc";
  whoId?: string;
  text: string;
};

type PlayConfig = {
  background?: string; // ✅ 시나리오별 배경
  suspects: PlaySuspect[];
  messages: ChatMessage[];
  timeLimitSec?: number;
  intro?: string;
  map?: string;
  spotlight?: SpotlightCfg; // 스포트라이트 튜닝
};

/* ---------- 이미지 경로 보정 ---------- */
function resolveURL(p?: string): string | undefined {
  if (!p) return undefined;
  if (/^https?:\/\//i.test(p)) return p;
  const base = (import.meta as any).env?.BASE_URL ?? "/";
  const normBase = base.endsWith("/") ? base.slice(0, -1) : base;

  if (p.startsWith("/")) return `${normBase}${p}`; // "/avatars/a.png"
  if (p.startsWith("avatars/")) return `${normBase}/${p}`; // "avatars/a.png"
  return `${normBase}/avatars/${p}`; // "a.png" → "/avatars/a.png"
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

  // 1) 서버 API
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

  // 2) mock/:id-play.json
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

  // 3) mock/:id.json  ← s1.json 사용됨
  try {
    const r2 = await fetch(join(`mock/${id}.json`), { cache: "no-store" });
    if (r2.ok) {
      const baseObj = (await r2.json()) as any;
      return {
        background: baseObj?.background ?? "/assets/background.jpg", // ✅ 동적+기본
        suspects: shapeSuspects(baseObj?.suspects ?? []),
        messages: [],
        timeLimitSec: 10 * 60 + 36,
        intro: baseObj?.intro ?? undefined,
        map: baseObj?.map ?? undefined,
        spotlight: baseObj?.spotlight ?? undefined,
      };
    }
  } catch {}

  // 4) 폴백
  return {
    background: "/assets/background.jpg", // ✅ 기본
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

  // ✅ 입장(마운트) 시 딱 한 번만: 첫 번째 용의자를 대화 패널 기본 선택
  const viewInitRef = useRef(false);
  useEffect(() => {
    if (viewInitRef.current) return; // 이미 설정했으면 실행 안 함
    if (suspects.length > 0) {
      setViewId(suspects[0].id); // 첫 번째 용의자 선택
      viewInitRef.current = true; // 이후엔 자동 변경 금지
    }
  }, [suspects]);

  const [chatOpen, setChatOpen] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);

  // ⏳ 타이머
  useEffect(() => {
    const t = window.setInterval(() => setElapsedSec((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  // ✅ 메모
  const [memoOpen, setMemoOpen] = useState(false);
  const memoText = useMemoStore((s) => s.text);
  const setMemoText = useMemoStore((s) => s.setText);
  const clearMemo = useMemoStore((s) => s.clear);

  // ✅ 사건 개요 & 지도 팝업
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

  // ✅ comment 프리로드
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

  /** 최근 메시지 미리보기 */
  const lastById = useMemo(() => {
    const map: Record<string, ChatMessage> = {};
    for (const m of msgs) {
      const key = m.whoId || "";
      if (!key) continue;
      map[key] = m;
    }
    return map;
  }, [msgs]);

  // 현재 보기 필터: 오직 viewId만 사용(없으면 전체 보기)
  const filterId = viewId;
  const visibleMsgs = useMemo(() => {
    if (!filterId) return msgs;
    return msgs.filter((m) => !m.whoId || m.whoId === filterId);
  }, [msgs, filterId]);

  /* =========================
     무대(중앙) 말풍선 & 스포트라이트
     ========================= */
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

  // 전송: 내 메시지는 무대 말풍선 X
  const send = () => {
    const text = input.trim();
    if (!text) return;
    if (!activeId) return alert("대화할 인물을 먼저 선택하세요.");

    setMsgs((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, from: "me", whoId: activeId, text },
    ]);
    setInput("");

    // 더미 NPC 응답
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

  // 스포트라이트 변수 (A안)
  const sp = data?.spotlight ?? {};
  const w = (sp.widthPct ?? 1.6) * 100;
  const h = (sp.heightPct ?? 1.9) * 100;
  const topRatio = sp.top ?? -0.28;
  const ang = sp.angleDeg ?? 18;
  const op = sp.opacity ?? 0.9;

  return (
    <div
      className={`play-root ${chatOpen ? "has-chat-open" : ""}`}
      /* ✅ 시나리오별 배경 적용 + 기본값 */
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

      {/* 좌측 도구 */}
      <div className="tools">
        <button
          className="tool-btn"
          title="사건 개요 & 지도"
          onClick={() => setOverviewOpen(true)}
        >
          📜
        </button>
        <button
          className="tool-btn"
          title="메모 작성"
          onClick={() => setMemoOpen((v) => !v)}
        >
          ✍️
        </button>
      </div>

      {/* 사건 개요 팝업 */}
      {overviewOpen && (
        <div className="overview-popup">
          <div className="overview-header">
            사건 개요 & 지도
            <button onClick={() => setOverviewOpen(false)}>✖</button>
          </div>
          <div className="overview-body">
            <h3>사건 개요</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {data?.intro ?? "시나리오 개요가 없습니다."}
            </p>

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
                // ❌ viewId는 따라가지 않음 (입장 초기화만 사용)
                const text =
                  last && last.from === "npc"
                    ? last.text
                    : s.comment ?? "무엇을 물어볼까요?";
                showNpcBubble(s.id, text);
              }}
              aria-pressed={sel}
              title={`${s.name} 대화하기`}
            >
              {/* ✅ CSS-only 스포트라이트 */}
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

              {/* NPC 말풍선 */}
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
        <div id="chat-body" className="chat-list" ref={listRef}>
          {visibleMsgs.map((m) => (
            <div key={m.id} className={`bubble ${m.from}`}>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* 패널 토글 */}
      <button
        type="button"
        className="chat-fab"
        onClick={() => setChatOpen((v) => !v)}
        aria-expanded={chatOpen}
        aria-controls="chat-body"
        title={chatOpen ? "대화창 닫기" : "대화창 열기"}
      >
        {chatOpen ? "»" : "«"}
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
