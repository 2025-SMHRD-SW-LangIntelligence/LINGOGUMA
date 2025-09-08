// src/pages/GamePlayPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "@/shared/api/client";
import "@/shared/styles/GamePlayPage.css";

/* ---------- 타입 ---------- */
interface ScenarioDetail {
  scenIdx: number;
  scenTitle: string;
  scenSummary: string;
  scenLevel: number;
  contentJson?: string | any;
}
interface Character {
  id?: string;
  name: string;
  role: string;
  age?: number;
  gender?: string;
  job?: string;
  personality?: string;
  alibi?: string;
  outfit?: string;
  sample_line?: string;
  avatar?: string;
  full?: string;
}
type PlaySuspect = {
  id: string;
  name: string;
  avatar: string;
  full?: string;
  comment?: string;
  facts?: string[];
};
type ChatMessage = {
  id: string;
  from: "me" | "npc";
  whoId?: string;
  text: string;
};
type AskResponse = {
  answer: string;
};
type SpotlightCfg = {
  top?: number;
  widthPct?: number;
  heightPct?: number;
  angleDeg?: number;
  opacity?: number;
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

/* ---------- SVG 아이콘 ---------- */
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

/* ---------- 이미지 ---------- */
import stageBg from "@/assets/images/background/s1_back.png";
import defaultMap from "@/assets/images/map/s1_map.png";
import summaryIcon from "@/assets/images/icons/summary.png";
import memoIcon from "@/assets/images/icons/memo.png";
import closeIcon from "@/assets/images/icons/close.png";
import placeholderAvatar from "@/assets/images/folder.png";
import placeholderFull from "@/assets/images/logo-thecase.png";
import actionIcon from "@/assets/images/icons/action.png"; // 액션 아이콘

const ACTION_ID = "__action__";

/* ---------- 세션별 키 ---------- */
const sk = (sid: number | null | undefined, name: string) =>
  sid ? `play_${name}_session_${sid}` : `play_${name}_session_unknown`;

/* ---------- glob import ---------- */
const avatarModules = import.meta.glob(
  "/src/assets/images/avatars/*.{png,jpg,jpeg,webp,svg}",
  { eager: true, import: "default" }
) as Record<string, string>;
const fullModules = import.meta.glob(
  "/src/assets/images/actors/*.{png,jpg,jpeg,webp,svg}",
  { eager: true, import: "default" }
) as Record<string, string>;

const avatarPool = Object.keys(avatarModules)
  .sort()
  .map((k) => avatarModules[k]);
const fullPool = Object.keys(fullModules)
  .sort()
  .map((k) => fullModules[k]);

/* ---------- 유틸 ---------- */
const basename = (p?: string) => (p || "").split("/").pop()?.toLowerCase();
function pickFromPool(
  hint: string | undefined,
  pool: string[],
  fallback: string
) {
  const b = basename(hint);
  if (!b) return fallback;
  return pool.find((p) => basename(p) === b) || fallback;
}
function safeParse(obj: unknown) {
  if (typeof obj === "string") {
    try {
      return JSON.parse(obj);
    } catch {
      return null;
    }
  }
  if (obj && typeof obj === "object") return obj as any;
  return null;
}
function toPlaySuspects(chars: Character[] | undefined): PlaySuspect[] {
  const list = (chars ?? []).slice(0, 4);
  return list.map((c, idx) => {
    const facts: string[] = [];
    if (c.job) facts.push(`직업: ${c.job}`);
    if (c.personality) facts.push(`성격: ${c.personality}`);
    if (c.outfit) facts.push(`옷차림: ${c.outfit}`);
    const avatar = pickFromPool(
      c.avatar,
      avatarPool,
      avatarPool[idx] || placeholderAvatar
    );
    const full = pickFromPool(c.full, fullPool, fullPool[idx] ?? "");
    return {
      id: String(c.id ?? `suspect_${idx + 1}`),
      name: c.name,
      avatar,
      full,
      comment: (c.sample_line ?? "").trim() || "무엇을 물어볼까요?",
      facts: facts.length ? facts : undefined,
    };
  });
}

/* ---------- 컴포넌트 ---------- */
export default function GamePlayPage() {
  const nav = useNavigate();
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = Number(searchParams.get("sessionId"));

  const [config, setConfig] = useState<PlayConfig>({
    background: stageBg,
    suspects: [],
    messages: [],
    timeLimitSec: 10 * 60 + 36,
    intro: undefined,
    map: defaultMap,
    spotlight: {
      top: -0.28,
      widthPct: 1.6,
      heightPct: 1.9,
      angleDeg: 18,
      opacity: 0.9,
    },
  });

  const suspects = config.suspects;
  const [activeId, setActiveId] = useState<string | null>(null); // 저장 안 함
  const [viewId, setViewId] = useState<string | null>(null); // 저장 안 함
  const [chatOpen, setChatOpen] = useState(false); // 저장 안 함
  const [actionMode, setActionMode] = useState(false); // 저장 안 함

  const [overviewOpen, setOverviewOpen] = useState(false); // ✅ 사건 개요 복구

  const [input, setInput] = useState("");
  const MSGS_KEY = sk(sessionId, "msgs");

  // ✅ 복원/저장 제어용 ref
  const hydratedRef = useRef(false);
  const skipNextSaveRef = useRef(true);

  // 대화 상태
  const [msgs, setMsgs] = useState<ChatMessage[]>([]); // ✅ 저장/복원
  const [asking, setAsking] = useState(false);

  // 메모(세션별) ✅ 저장/복원
  const MEMO_KEY = sk(sessionId, "memo");
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoText, setMemoText] = useState<string>(
    () => localStorage.getItem(MEMO_KEY) ?? ""
  );
  useEffect(() => {
    localStorage.setItem(MEMO_KEY, memoText);
  }, [MEMO_KEY, memoText]);
  const clearMemo = () => setMemoText("");

  // 타이머(세션별) ✅ 저장/복원
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);
  const TIMER_KEY = sessionId
    ? `timer_session_${sessionId}`
    : "timer_session_unknown";
  useEffect(() => {
    // 기존 값 복원
    const v = sessionStorage.getItem(TIMER_KEY);
    if (v && !isNaN(Number(v))) setSeconds(Number(v));

    timerRef.current = window.setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        sessionStorage.setItem(TIMER_KEY, String(next));
        return next;
      });
    }, 1000) as unknown as number;
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [TIMER_KEY]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  /* --- 대화 복원 --- */
  useEffect(() => {
    // 1) 복원
    try {
      const raw = sessionStorage.getItem(MSGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setMsgs(parsed as ChatMessage[]);
        }
      }
    } catch {
      /* noop */
    }
    // 2) 복원 완료 표시 및 최초 저장 스킵 플래그 ON
    hydratedRef.current = true;
    skipNextSaveRef.current = true;
  }, [MSGS_KEY]);

  /* --- 대화 저장: 복원 직후 첫 저장 한 번은 스킵 --- */
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (skipNextSaveRef.current) {
      // 복원 렌더 사이클의 첫 저장은 건너뛰어 빈 배열이 덮어쓰는 것을 방지
      skipNextSaveRef.current = false;
      return;
    }
    try {
      sessionStorage.setItem(MSGS_KEY, JSON.stringify(msgs));
    } catch {
      /* noop */
    }
  }, [MSGS_KEY, msgs]);

  /* --- 시나리오 불러오기 --- */
  useEffect(() => {
    (async () => {
      try {
        if (!scenarioId) return;
        const res = await api.get<ScenarioDetail>(`/scenarios/${scenarioId}`);
        const parsed = safeParse(res.data.contentJson) ?? {};
        const chars: Character[] = Array.isArray(parsed?.characters)
          ? parsed.characters
          : [];

        const suspectsBase = toPlaySuspects(chars);
        const actionEntry: PlaySuspect = {
          id: ACTION_ID,
          name: "조사",
          avatar: actionIcon,
          comment: "무엇을 조사할까요?",
          facts: [
            "현장 조사, CCTV 확인, 기록 조회, 목격자 증언 수집 등을 수행합니다.",
          ],
        };
        const suspectsAll = [...suspectsBase, actionEntry];

        setConfig((prev) => ({
          ...prev,
          background: stageBg,
          suspects: suspectsAll,
          messages: [],
          intro:
            String(res.data.scenSummary ?? "") || "시나리오 개요가 없습니다.",
          map: defaultMap,
          spotlight: parsed?.spotlight ?? prev.spotlight,
        }));

        // UI 초기화(저장은 안 함). 저장된 대화가 없을 때만 기본 멘트 주입
        if (suspectsBase.length > 0) {
          setActiveId(suspectsBase[0].id);
          setViewId(suspectsBase[0].id);

          // ✅ 저장된 대화 "없거나 길이=0"이면 초기 진술 주입
          let existingLen = 0;
          try {
            const existingRaw = sessionStorage.getItem(MSGS_KEY);
            const parsed = existingRaw ? JSON.parse(existingRaw) : null;
            existingLen = Array.isArray(parsed) ? parsed.length : 0;
          } catch {
            existingLen = 0;
          }

          if (existingLen === 0) {
            const baseMsgs: ChatMessage[] = suspectsBase
              .filter((s) => !!s.comment?.trim())
              .map((s) => ({
                id: `c-${s.id}`,
                from: "npc",
                whoId: s.id,
                text: s.comment!.trim(),
              }));

            setMsgs(baseMsgs);
            // 복원 직후 첫 저장 스킵을 해제하고 즉시 저장
            try {
              sessionStorage.setItem(MSGS_KEY, JSON.stringify(baseMsgs));
              skipNextSaveRef.current = false;
            } catch {
              /* noop */
            }
          }
        }
      } catch (err) {
        console.error("시나리오 불러오기 실패:", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, MSGS_KEY]);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, viewId, chatOpen]);

  const lastById = useMemo(() => {
    const map: Record<string, ChatMessage> = {};
    for (const m of msgs) {
      const key = m.whoId || "";
      if (!key) continue;
      map[key] = m;
    }
    return map;
  }, [msgs]);

  const visibleMsgs = useMemo(() => {
    if (!viewId) return msgs;
    return msgs.filter((m) => !m.whoId || m.whoId === viewId);
  }, [msgs, viewId]);

  /* --- 무대 말풍선 --- */
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

  /* -------------------------------
     ✅ 용의자 소개(브리핑) 상태/로직
     ------------------------------- */
  type BriefItem = PlaySuspect & {
    facts: string[];
    quote?: string;
  };

  const briefList: BriefItem[] = useMemo(() => {
    return (suspects ?? [])
      .filter((s) => s.id !== ACTION_ID) // 조사(Action) 항목 제외
      .map((s) => {
        const facts = Array.isArray(s.facts) ? s.facts.map(String) : [];
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
    currentBrief?.full || currentBrief?.avatar || placeholderFull;

  const closeBrief = () => setBriefOpen(false);
  const nextBrief = () => {
    if (briefIdx < briefList.length - 1) setBriefIdx((i) => i + 1);
    else closeBrief();
  };
  const prevBrief = () => {
    if (briefIdx > 0) setBriefIdx((i) => i - 1);
  };

  /* --- 질문 전송 --- */
  const send = async () => {
    const text = input.trim();
    if (!text) return;

    if (!actionMode && !activeId)
      return alert("대화할 인물을 먼저 선택하세요.");
    if (!sessionId)
      return alert(
        "세션 정보가 없습니다. 시나리오 선택 화면에서 다시 시작해주세요."
      );

    const targetId = actionMode ? ACTION_ID : (activeId as string);
    const who = actionMode
      ? ({ name: "ACTION" } as { name: string })
      : suspects.find((s) => s.id === targetId);
    if (!who) return;

    if (actionMode) {
      setChatOpen(true);
      setViewId(ACTION_ID);
    }

    const myMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      from: "me",
      whoId: targetId,
      text,
    };
    setMsgs((prev) => [...prev, myMsg]);
    setInput("");

    try {
      setAsking(true);
      const res = await api.post<AskResponse>("/game/ask", {
        sessionId,
        suspectName: actionMode ? "ACTION" : (who as any).name,
        userText: text,
        action: actionMode ? true : undefined,
      });
      const reply = res.data.answer || "…응답이 없습니다.";
      const npcMsg: ChatMessage = {
        id: `r-${Date.now()}`,
        from: "npc",
        whoId: targetId,
        text: reply,
      };
      setMsgs((prev) => [...prev, npcMsg]);

      if (!actionMode) showNpcBubble(targetId, reply);
    } catch (err) {
      console.error("질문 처리 실패:", err);
      alert("질문 처리에 실패했습니다.");
    } finally {
      setAsking(false);
    }
  };
  const onEnter: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!asking) send();
    }
  };

  /* --- 결과 페이지 이동 --- */
  const goResult = () => {
    if (!sessionId) return alert("세션 정보가 없습니다.");
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const playDuration = seconds;
    sessionStorage.setItem(TIMER_KEY, String(playDuration));
    nav(`/play/${scenarioId}/result?sessionId=${sessionId}&t=${playDuration}`, {
      state: { totalDuration: playDuration },
    });
  };

  /* --- spotlight --- */
  const sp = config.spotlight ?? {};
  const w = (sp.widthPct ?? 1.6) * 100;
  const h = (sp.heightPct ?? 1.9) * 100;
  const topRatio = sp.top ?? -0.28;
  const ang = sp.angleDeg ?? 18;
  const op = sp.opacity ?? 0.9;

  /* --- 메모 드래그 --- */
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

  return (
    <div
      className={`play-root ${chatOpen ? "has-chat-open" : ""}`}
      style={{
        backgroundImage: `url(${config.background || stageBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* 타이머 */}
      <button className="timer-badge" onClick={goResult}>
        심문 종료 ({mm}:{ss})
      </button>

      {/* ✅ 용의자 소개(브리핑) 오버레이 */}
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
                onError={(e) => (e.currentTarget.src = placeholderFull)}
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

      {/* 좌측 도구 */}
      <div className="tools">
        <button
          className={`tool-btn ${overviewOpen ? "is-on" : ""}`}
          onClick={() => setOverviewOpen((v) => !v)}
        >
          <img className="icon" src={summaryIcon} alt="사건 개요" />
        </button>

        <button
          className={`tool-btn ${memoOpen ? "is-on" : ""}`}
          onClick={() => setMemoOpen((v) => !v)}
        >
          <img className="icon" src={memoIcon} alt="메모" />
        </button>
      </div>

      {/* ✅ 사건 개요 팝업 (복구) */}
      {overviewOpen && (
        <div className="overview-popup">
          <div className="overview-header">
            사건 개요 & 지도
            <button
              className="icon-close"
              onClick={() => setOverviewOpen(false)}
            >
              <img className="icon" src={closeIcon} alt="닫기" />
            </button>
          </div>
          <div className="overview-body">
            <h3>사건 개요</h3>
            <p>{config.intro ?? "시나리오 개요가 없습니다."}</p>

            <h3>지도</h3>
            {config.map ? (
              <img
                src={config.map}
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
          style={{ top: memoPos.y, left: memoPos.x, position: "absolute" }}
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

      {/* 중앙 무대 (UI 상태 저장 없음) */}
      <div className="stage">
        {suspects
          .filter((s) => s.id !== ACTION_ID)
          .slice(0, 4)
          .map((s) => {
            const sel = s.id === activeId;
            const last = lastById[s.id];
            return (
              <button
                key={s.id}
                type="button"
                className={`actor-btn ${sel ? "is-active" : ""}`}
                onClick={() => {
                  setActiveId(s.id);
                  setViewId(s.id);
                  setActionMode(false);
                  const text =
                    last && last.from === "npc"
                      ? last.text
                      : s.comment ?? "무엇을 물어볼까요?";
                  setStageBubble({ whoId: s.id, text });
                  if (bubbleTimer.current)
                    window.clearTimeout(bubbleTimer.current);
                  bubbleTimer.current = window.setTimeout(
                    () => setStageBubble(null),
                    BUBBLE_MS
                  ) as unknown as number;
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
                    src={s.full}
                    alt={s.name}
                    onError={(e) => (e.currentTarget.src = placeholderFull)}
                  />
                ) : (
                  <div className="actor-avatar">
                    <img
                      src={s.avatar || placeholderAvatar}
                      alt={s.name}
                      onError={(e) => (e.currentTarget.src = placeholderAvatar)}
                    />
                  </div>
                )}
                <span className="actor-name">{s.name}</span>
              </button>
            );
          })}
      </div>

      {/* 오른쪽 대화 패널 (열림 상태 저장 안 함) */}
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
                  src={s.avatar || placeholderAvatar}
                  alt={s.name}
                  onError={(e) => (e.currentTarget.src = placeholderAvatar)}
                />
                <span className="chat-ava-name">{s.name}</span>
              </button>
            );
          })}
        </div>

        {/* 선택된 인물 FACTS */}
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

        {/* 대화 내역 */}
        <div id="chat-body" className="chat-list" ref={listRef}>
          {visibleMsgs.map((m) => (
            <div key={m.id} className={`bubble ${m.from}`}>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* 대화창 토글 */}
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
        <button
          type="button"
          className={`action-btn ${actionMode ? "is-on" : ""}`}
          onClick={() => {
            setActionMode((v) => {
              const next = !v;
              if (next) setViewId(ACTION_ID);
              return next;
            });
          }}
          aria-pressed={actionMode}
          aria-label="액션 모드 토글"
          title={actionMode ? "액션 모드: 켜짐" : "액션 모드: 꺼짐"}
        >
          <img src={actionIcon} alt="액션" />
        </button>
        <input
          className="input"
          placeholder={
            asking
              ? "질문 전송 중..."
              : actionMode
              ? "// 조사/확인할 내용을 입력하세요"
              : "// 이곳에 질문을 입력하세요"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onEnter}
          disabled={asking}
        />
        <button className="send-btn" onClick={send} disabled={asking}>
          {asking ? "질문 중..." : "보내기"}
        </button>
      </div>
    </div>
  );
}
