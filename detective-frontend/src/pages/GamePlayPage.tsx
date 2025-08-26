// src/pages/GamePlayPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useScenario } from "../store/scenario.store";
import { api } from "../shared/api/client";
import "./GamePlayPage.css";

/** ---------- 타입 ---------- */
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

/** ---------- 유틸 ---------- */
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

/** ✅ 플레이 설정 로드: API → /mock/:id-play.json → /mock/:id.json(suspects만) → 폴백 */
async function loadPlayConfig(id: string): Promise<PlayConfig> {
  // 1) API
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

  // 2) mock: :id-play.json
  try {
    const r = await fetch(`/mock/${id}-play.json`, { cache: "no-store" });
    if (r.ok) {
      const obj = (await r.json()) as any;
      return {
        background: obj.background ?? undefined,
        suspects: shapeSuspects(obj.suspects ?? []), // 없으면 다음 단계에서 채움
        messages: shapeMessages(obj.messages ?? []),
        timeLimitSec: Number.isFinite(obj.timeLimitSec)
          ? obj.timeLimitSec
          : 10 * 60 + 36,
      };
    }
  } catch {}

  // 3) mock: 기본 :id.json 에서 suspects만
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

  // 4) 최종 폴백(하드코딩 제거)
  return {
    background: undefined,
    suspects: [],
    messages: [],
    timeLimitSec: 10 * 60 + 36,
  };
}

/** ---------- 페이지 컴포넌트 ---------- */
export default function GamePlayPage() {
  const nav = useNavigate();
  const { scenarioId } = useParams<{ scenarioId: string }>();

  // ✅ selector를 각각 사용(새 객체 생성 X)
  const currentScenarioId = useScenario((s) => s.currentScenarioId);
  const setCurrentScenarioId = useScenario((s) => s.setCurrentScenarioId);

  /** URL의 :scenarioId → 전역 store로 1회만 동기화 (무한루프 방지) */
  const syncOnceRef = useRef(false);
  useEffect(() => {
    if (syncOnceRef.current) return;
    if (scenarioId) {
      syncOnceRef.current = true;
      setCurrentScenarioId(scenarioId); // store 내부에서 동일값이면 무시하도록 구현
    }
  }, [scenarioId, setCurrentScenarioId]);

  /** 데이터 로드 */
  const { data } = useQuery({
    queryKey: ["play-config", currentScenarioId],
    enabled: !!currentScenarioId,
    queryFn: () => loadPlayConfig(currentScenarioId!),
    staleTime: 5 * 60 * 1000,
  });

  const suspects = useMemo(() => data?.suspects ?? [], [data]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);

  /** 초기 세팅 */
  useEffect(() => {
    if (!data) return;
    setMsgs(data.messages ?? []);
    setActiveId((data.suspects && data.suspects[0]?.id) || null);
    setLeftSec(data.timeLimitSec ?? 10 * 60 + 36);
  }, [data]);

  /** 타이머 */
  const [leftSec, setLeftSec] = useState<number>(10 * 60 + 36);
  useEffect(() => {
    const t = window.setInterval(
      () => setLeftSec((x) => (x > 0 ? x - 1 : 0)),
      1000
    );
    return () => window.clearInterval(t);
  }, []);
  const mm = String(Math.floor(leftSec / 60)).padStart(2, "0");
  const ss = String(leftSec % 60).padStart(2, "0");

  /** 대화 스크롤 유지 */
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, activeId]);

  /** 전송 */
  const send = () => {
    const text = input.trim();
    if (!text || !activeId) return;
    setMsgs((m) => [
      ...m,
      { id: `m-${Date.now()}`, from: "me", text, whoId: activeId },
    ]);
    setInput("");
    // 데모용 자동 응답
    setTimeout(() => {
      setMsgs((m) => [
        ...m,
        {
          id: `r-${Date.now()}`,
          from: "npc",
          whoId: activeId,
          text: "…계속 조사 중입니다.",
        },
      ]);
    }, 500);
  };
  const onEnter: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  };

  /** 현재 선택 용의자 대화만 보기 */
  const visibleMsgs = useMemo(() => {
    if (!activeId) return [];
    return msgs.filter((m) => !m.whoId || m.whoId === activeId);
  }, [msgs, activeId]);

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
      className="play-root"
      style={
        data?.background
          ? { backgroundImage: `url(${data.background})` }
          : undefined
      }
    >
      {/* 상단 좌측 타이머 */}
      <div className="timer-badge">
        심문종료 ({mm}:{ss})
      </div>

      {/* 좌측 도구(장식) */}
      <div className="tools">
        <button className="tool-btn" title="증거 검색">
          🔎
        </button>
        <button className="tool-btn" title="메모 작성">
          ✍️
        </button>
      </div>

      {/* 중앙 무대(캐릭터) */}
      <div className="stage">
        {suspects.slice(0, 4).map((s) => (
          <div key={s.id} className="actor">
            {s.full ? (
              <img className="actor-full" src={s.full} alt={s.name} />
            ) : (
              <div className="actor-avatar">
                <img src={s.avatar} alt={s.name} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 우측 대화 패널 */}
      <aside className="chat-panel">
        <div className="chat-avatars">
          {suspects.map((s) => {
            const sel = s.id === activeId;
            return (
              <button
                key={s.id}
                className={`chat-ava ${sel ? "is-active" : ""}`}
                onClick={() => setActiveId(s.id)}
                title={s.name}
              >
                <img src={s.avatar} alt={s.name} />
              </button>
            );
          })}
        </div>

        <div className="chat-list" ref={listRef}>
          {visibleMsgs.map((m) => (
            <div key={m.id} className={`bubble ${m.from}`}>
              <p>{m.text}</p>
            </div>
          ))}
        </div>

        <div className="chat-arrow">»</div>
      </aside>

      {/* 하단 입력 Dock */}
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
