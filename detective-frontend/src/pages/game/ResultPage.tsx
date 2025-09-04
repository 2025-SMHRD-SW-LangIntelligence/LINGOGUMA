// src/pages/ResultPage.tsx
import { useState, useEffect, useRef } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { api } from "@/shared/api/client";
import { useAuth } from "@/store/auth.store";
import "@/shared/styles/CaseResultPage.css";

import avatar1 from "@/assets/images/avatars/s1_1.png";
import avatar2 from "@/assets/images/avatars/s1_2.png";
import avatar3 from "@/assets/images/avatars/s1_3.png";

const fallbackAvatars = [avatar1, avatar2, avatar3];

/* 시나리오 타입 */
type ScenarioDetail = {
  scenIdx: number;
  scenTitle: string;
  scenSummary: string;
  scenLevel: number;
  contentJson?: string | any;
};

/* ✅ GamePlay와 동일 규칙의 세션별 키 유틸 (없으면 폴백 처리용) */
const sk = (sid: number | null | undefined, name: string) =>
  sid ? `play_${name}_session_${sid}` : `play_${name}_session_unknown`;

export default function ResultPage() {
  const { scenarioId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const sessionId = Number(searchParams.get("sessionId"));

  /* 상태 */
  const [suspects, setSuspects] = useState<
    { id: string; name: string; avatar?: string }[]
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [whenText, setWhenText] = useState("");
  const [howText, setHowText] = useState("");
  const [whyText, setWhyText] = useState("");

  /* 총 플레이 시간 (GamePlay에서 가져옴) */
  const TIMER_KEY = sessionId
    ? `timer_session_${sessionId}`
    : "timer_session_unknown";
  const initialFromState = (location.state as any)?.totalDuration as
    | number
    | undefined;
  const initialFromQuery = (() => {
    const t = searchParams.get("t");
    return t && !isNaN(Number(t)) ? Number(t) : undefined;
  })();
  const initialFromStorage = (() => {
    const v = sessionStorage.getItem(TIMER_KEY);
    return v && !isNaN(Number(v)) ? Number(v) : undefined;
  })();
  const totalDuration =
    initialFromState ?? initialFromQuery ?? initialFromStorage ?? 0;
  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(
      2,
      "0"
    )}`;

  /* 보고서 작성 시간 */
  const [reportSeconds, setReportSeconds] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setReportSeconds((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  /* 시나리오 characters 불러오기 */
  useEffect(() => {
    const fetchScenario = async () => {
      try {
        if (!scenarioId) return;
        const res = await api.get<ScenarioDetail>(`/scenarios/${scenarioId}`);
        let content: any = res.data.contentJson;
        if (typeof content === "string") {
          try {
            content = JSON.parse(content);
          } catch {
            content = {};
          }
        }
        const chars = Array.isArray(content?.characters)
          ? content.characters
          : [];
        const names = chars
          .filter((c: any) => ["용의자", "범인"].includes(c?.role))
          .map((c: any, idx: number) => ({
            id: `s_${idx}`,
            name: String(c?.name || ""),
            avatar: c.avatar || fallbackAvatars[idx] || "", // 없으면 CSS에서 placeholder 처리
          }))
          .filter(
            (c: { id: string; name: string; avatar?: string }) => !!c.name
          );
        setSuspects(names);
      } catch (err) {
        console.error("시나리오 불러오기 실패:", err);
      }
    };
    fetchScenario();
  }, [scenarioId]);

  /* 제출 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return alert("세션 ID가 없습니다.");
    if (!selectedId) return alert("범인을 선택해주세요.");
    if (!whenText.trim()) {
      return alert('"언제?"에 대한 답변을 입력해주세요.');
    }
    if (!howText.trim()) {
      return alert('"어떻게?"에 대한 답변을 입력해주세요.');
    }
    if (!whyText.trim()) {
      return alert('"왜?"에 대한 답변을 입력해주세요.');
    }

    const selected = suspects.find((s) => s.id === selectedId);

    const payload = {
      sessionId,
      scenIdx: Number(scenarioId),
      userIdx: user ? user.userIdx : null,
      answerJson: {
        culprit: selected?.name ?? "",
        when: whenText,
        how: howText,
        why: whyText,
      },
      timings: {
        total_duration: totalDuration,
        report_duration: reportSeconds,
        per_turn: [],
      },
    };

    try {
      const { data } = await api.post("/game/result", payload);
      const resultId = data?.resultId;
      if (!resultId) {
        alert("결과 저장은 되었지만 resultId를 받지 못했습니다.");
        return;
      }
      navigate(`/play/${scenarioId}/analysis?resultId=${resultId}`);
    } catch (err) {
      console.error("결과 제출 실패:", err);
      alert("결과 저장에 실패했습니다.");
    }
  };

  /* ✅ 메모 팝업: GamePlay 세션키 우선, 없으면 기존 'detective_memo' 폴백 */
  const MEMO_KEY = sk(sessionId, "memo");
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoText] = useState(() => {
    const v1 = localStorage.getItem(MEMO_KEY);
    if (v1 != null) return v1; // 세션별 메모가 있으면 이걸 사용
    const v2 = localStorage.getItem("detective_memo"); // 구버전 호환
    return v2 ?? "";
  });
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 210, y: 120 });
  const dragData = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const onDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    dragData.current = {
      offsetX: e.clientX - pos.x,
      offsetY: e.clientY - pos.y,
    };
    document.addEventListener("mousemove", onDragging);
    document.addEventListener("mouseup", onDragEnd);
  };
  const onDragging = (e: MouseEvent) => {
    if (!dragData.current) return;
    setPos({
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
    <div className="summary-root" onMouseUp={onDragEnd}>
      <div className="summary-panel">
        {/* 헤더 */}
        <div className="summary-header">
          <h2 className="summary-title">사건의 전말</h2>
          <p className="summary-time" style={{ display: "none" }}>
            총 플레이: <b>{formatTime(totalDuration)}</b> · 보고서 작성:{" "}
            <b>{formatTime(reportSeconds)}</b>
          </p>
          <button className="memo-btn" onClick={() => setMemoOpen(true)}>
            📝 메모 보기
          </button>
        </div>

        {/* 메모 팝업 */}
        {memoOpen && (
          <div
            className="memo-popup"
            style={{ top: pos.y, left: pos.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="memo-header" onMouseDown={onDragStart}>
              <span>내 메모</span>
              <button onClick={() => setMemoOpen(false)}>✖</button>
            </div>
            <textarea
              value={memoText}
              readOnly
              className="momo-readonly"
              placeholder="플레이 도중 작성한 메모가 여기에 표시됩니다."
            />
          </div>
        )}

        {/* 용의자 선택 */}
        <div className="suspects-row">
          {suspects.length > 0 ? (
            suspects.map((s) => {
              const sel = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`suspect-card ${sel ? "selected" : ""}`}
                  onClick={() => setSelectedId(s.id)}
                  aria-pressed={sel}
                  title={`${s.name} 선택`}
                >
                  <div className="avatar-wrap">
                    <img
                      className="avatar"
                      src={s.avatar || ""}
                      alt={s.name}
                      loading="lazy"
                    />
                    <div className="ring" />
                  </div>
                  <span className="suspect-name">{s.name}</span>
                </button>
              );
            })
          ) : (
            <p>용의자 목록 불러오는 중...</p>
          )}
        </div>

        {/* 질문/답변 */}
        <form className="qa-form" onSubmit={handleSubmit}>
          <label className="q-label">
            언제?
            <textarea
              className="q-textarea"
              placeholder="예: 오후 2시, 도서관 서고에서"
              rows={2}
              value={whenText}
              onChange={(e) => setWhenText(e.target.value)}
            />
          </label>
          <label className="q-label">
            어떻게?
            <textarea
              className="q-textarea"
              placeholder="예: 창문을 통해 몰래 들어가 고서를 가방에 넣음"
              rows={2}
              value={howText}
              onChange={(e) => setHowText(e.target.value)}
            />
          </label>
          <label className="q-label">
            왜?
            <textarea
              className="q-textarea"
              placeholder="예: 비싼 고서를 팔아 돈을 벌기 위해"
              rows={2}
              value={whyText}
              onChange={(e) => setWhyText(e.target.value)}
            />
          </label>

          <div className="action-bar">
            <button className="submit-btn" type="submit" disabled={!selectedId}>
              추리 결과 제출
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
