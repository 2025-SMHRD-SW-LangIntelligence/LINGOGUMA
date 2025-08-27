import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../shared/api/client";
import { useScenario } from "../store/scenario.store";
import { useMemoStore } from "../store/memo.store";
import "./GamePlayPage.css";

/* ---------- 타입 ---------- */
type PlaySuspect = { id: string; name: string; avatar: string; full?: string };
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

/** API → /mock/:id-play.json → /mock/:id.json(suspects만) → 폴백 */
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
      };
    }
  } catch {}
  try {
    const r = await fetch(`/mock/${id}-play.json`, { cache: "no-store" });
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
      };
    }
  } catch {}
  try {
    const r2 = await fetch(`/mock/${id}.json`, { cache: "no-store" });
    if (r2.ok) {
      const base = (await r2.json()) as any;
      return {
        background: undefined,
        suspects: shapeSuspects(base?.suspects ?? []),
        messages: [],
        timeLimitSec: 10 * 60 + 36,
        intro: base?.intro ?? undefined,
        map: base?.map ?? undefined,
      };
    }
  } catch {}
  return {
    background: undefined,
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

  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(true);
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

  // ✅ 메모 상태
  const [memoOpen, setMemoOpen] = useState(false);
  const memoText = useMemoStore((s) => s.text);
  const setMemoText = useMemoStore((s) => s.setText);
  const clearMemo = useMemoStore((s) => s.clear);

  // ✅ 사건 개요 & 지도 상태
  const [overviewOpen, setOverviewOpen] = useState(false);

  // 메모창 위치
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

  useEffect(() => {
    if (!data) return;
    setMsgs(data.messages ?? []);
    setActiveId((data.suspects && data.suspects[0]?.id) || null);
  }, [data]);

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

  const lastById = useMemo(() => {
    const map: Record<string, ChatMessage> = {};
    for (const m of msgs) {
      const key = m.whoId || "";
      if (!key) continue;
      map[key] = m;
    }
    return map;
  }, [msgs]);

  const filterId = viewId ?? activeId;
  const visibleMsgs = useMemo(() => {
    if (!filterId) return [];
    return msgs.filter((m) => !m.whoId || m.whoId === filterId);
  }, [msgs, filterId]);

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

  return (
    <div
      className={`play-root ${chatOpen ? "has-chat-open" : ""}`}
      style={
        data?.background
          ? { backgroundImage: `url(${data.background})` }
          : undefined
      }
    >
      {/* 좌상단 타이머 */}
      <button className="timer-badge" onClick={goToResult}>
        심문 종료 ({mm}:{ss})
      </button>

      {/* 좌측 도구 */}
      <div className="tools">
        {/* 사건 개요 & 지도 버튼 */}
        <button
          className="tool-btn"
          title="사건 개요 & 지도"
          onClick={() => setOverviewOpen(true)}
        >
          📜
        </button>

        {/* 메모 버튼 */}
        <button
          className="tool-btn"
          title="메모 작성"
          onClick={() => setMemoOpen((v) => !v)}
        >
          ✍️
        </button>
      </div>

      {/* ✅ 사건 개요 팝업 */}
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
            <img
              src={data.map}
              alt="시나리오 지도"
              style={{ width: "100%", borderRadius: "8px" }}
            />
          </div>
        </div>
      )}

      {/* ✅ 메모 팝업 */}
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
                if (viewId == null) setViewId(s.id);
                const text =
                  last && last.from === "npc"
                    ? last.text
                    : "무엇을 물어볼까요?";
                showNpcBubble(s.id, text);
              }}
              aria-pressed={sel}
              title={`${s.name} 대화하기`}
            >
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
            const viewing = s.id === (viewId ?? activeId);
            return (
              <button
                key={s.id}
                className={`chat-ava ${viewing ? "is-active" : ""}`}
                onClick={() => setViewId(s.id)}
                title={`${s.name} 대화 내역 보기`}
              >
                <img
                  src={resolveURL(s.avatar)}
                  alt={s.name}
                  onError={(e) =>
                    (e.currentTarget.src = resolveURL("placeholder.png")!)
                  }
                />
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
