import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../shared/api/client";
import { useScenario } from "../store/scenario.store";
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
};

/* ---------- 이미지 경로 보정 ---------- */
/** public/avatars 에 넣었을 때도, 외부 URL일 때도, 상대경로일 때도 안전하게 */
// 기존 resolveURL 함수 교체
function resolveURL(p?: string): string | undefined {
  if (!p) return undefined;
  if (/^https?:\/\//i.test(p)) return p; // 외부 URL
  const base = (import.meta as any).env?.BASE_URL ?? "/"; // Vite base 지원
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
      };
    }
  } catch {}
  return {
    background: undefined,
    suspects: [],
    messages: [],
    timeLimitSec: 10 * 60 + 36,
  };
}

export default function GamePlayPage() {
  const nav = useNavigate();
  const { scenarioId: scenarioIdInUrl } = useParams<{ scenarioId: string }>();

  const currentScenarioId = useScenario((s) => s.currentScenarioId);
  const setCurrentScenarioId = useScenario((s) => s.setCurrentScenarioId);

  // URL → store 1회 동기화(루프 방지)
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

  /** ✅ 대화 ‘대상’(전송 타겟)과 ‘보기’(히스토리 필터) 분리 */
  const [activeId, setActiveId] = useState<string | null>(null); // 중앙 아바타 클릭으로만 변경
  const [viewId, setViewId] = useState<string | null>(null); // 우측 패널 아바타로만 변경

  const [chatOpen, setChatOpen] = useState(true);
  const [leftSec, setLeftSec] = useState<number>(10 * 60 + 36);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);

  // ⏳ 타이머
  useEffect(() => {
    const t = window.setInterval(
      () => setLeftSec((x) => (x > 0 ? x - 1 : 0)),
      1000
    );
    return () => window.clearInterval(t);
  }, []);
  const mm = String(Math.floor(leftSec / 60)).padStart(2, "0");
  const ss = String(leftSec % 60).padStart(2, "0");

  // 데이터 세팅
  useEffect(() => {
    if (!data) return;
    setMsgs(data.messages ?? []);
    setActiveId((data.suspects && data.suspects[0]?.id) || null);
    setLeftSec(data.timeLimitSec ?? 10 * 60 + 36);
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

  /** 최근 메시지(미리보기용) */
  const lastById = useMemo(() => {
    const map: Record<string, ChatMessage> = {};
    for (const m of msgs) {
      const key = m.whoId || "";
      if (!key) continue;
      map[key] = m;
    }
    return map;
  }, [msgs]);

  // 현재 ‘보기’ 대상의 메시지들만(없으면 activeId)
  const filterId = viewId ?? activeId;
  const visibleMsgs = useMemo(() => {
    if (!filterId) return [];
    return msgs.filter((m) => !m.whoId || m.whoId === filterId);
  }, [msgs, filterId]);

  /* =========================
     무대(중앙) 말풍선: NPC만 표시
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

  // 전송: 내 메시지는 무대 말풍선 X (오른쪽 패널만 기록), ‘대상’은 activeId
  const send = () => {
    const text = input.trim();
    if (!text) return;
    if (!activeId) return alert("대화할 인물을 먼저 선택하세요.");

    setMsgs((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, from: "me", whoId: activeId, text },
    ]);
    setInput("");

    // 더미 NPC 응답 + 무대 말풍선(보이게)
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

  // 결과 입력 페이지로 이동
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
        <button className="tool-btn" title="증거 검색">
          🔎
        </button>
        <button className="tool-btn" title="메모 작성">
          ✍️
        </button>
      </div>

      {/* 중앙 무대: ‘대상 선택’은 여기서만 */}
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
                setActiveId(s.id); // ✅ 보내기 대상만 변경
                if (viewId == null) setViewId(s.id); // 처음엔 보기 대상도 맞춰줌
                const text =
                  last && last.from === "npc"
                    ? last.text
                    : "무엇을 물어볼까요?";
                showNpcBubble(s.id, text);
              }}
              aria-pressed={sel}
              title={`${s.name} 대화하기`}
            >
              {/* 무대 말풍선: NPC 텍스트만 */}
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

      {/* 오른쪽 대화 패널: ‘보기 대상’만 변경(보내기 대상은 영향 X) */}
      <aside className={`chat-panel ${chatOpen ? "" : "is-closed"}`}>
        <div className="chat-avatars">
          {suspects.map((s) => {
            const viewing = s.id === (viewId ?? activeId);
            return (
              <button
                key={s.id}
                className={`chat-ava ${viewing ? "is-active" : ""}`}
                onClick={() => setViewId(s.id)} // ✅ 보기 필터만 변경
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

      {/* 패널 토글 버튼 */}
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

      {/* 하단 입력: 항상 activeId(중앙 선택 대상)에게 전송 */}
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
