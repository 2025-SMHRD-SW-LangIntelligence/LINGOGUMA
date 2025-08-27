import { useMemo, useState, useRef } from "react";
import type { Suspect, Question } from "../shared/types/case";
import { useMemoStore } from "../store/memo.store";
import "./CaseResultPage.css";

export default function CaseResultPage(props: {
  suspects?: Suspect[];
  questions?: Question[];
  onSubmit?: (payload: {
    culpritId: string;
    answers: Record<string, string>;
  }) => void;
}) {
  const suspects = useMemo(() => props.suspects ?? [], [props.suspects]);
  const questions = useMemo(() => props.questions ?? [], [props.questions]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});

  // ✅ 메모 상태
  const memoText = useMemoStore((s) => s.text);
  const setMemoText = useMemoStore((s) => s.setText);

  // ✅ 팝업 열림/닫힘
  const [memoOpen, setMemoOpen] = useState(false);

  // ✅ 팝업 위치 & 드래그
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

  const setAnswer = (qid: string, v: string) =>
    setAnswerMap((p) => ({ ...p, [qid]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return alert("범인을 한 명 선택해주세요.");
    for (const q of questions) {
      if (q.required && !answerMap[q.id]?.trim()) {
        return alert(`"${q.label}"에 답변을 입력해주세요.`);
      }
      if (q.maxLength && (answerMap[q.id] ?? "").length > q.maxLength) {
        return alert(`"${q.label}"은 최대 ${q.maxLength}자까지 입력 가능해요.`);
      }
    }
    const payload = { culpritId: selectedId, answers: answerMap };
    props.onSubmit ? props.onSubmit(payload) : console.log(payload);
  };

  return (
    <div className="summary-root">
      <div className="summary-panel">
        {/* ✅ 상단 헤더: 제목 + 메모 버튼 */}
        <div className="summary-header">
          <h2 className="summary-title">사건의 전말</h2>
          <button className="memo-btn" onClick={() => setMemoOpen(true)}>
            📝 메모 보기
          </button>
        </div>

        {/* ✅ 팝업 메모창 */}
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
          {suspects.map((s) => {
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
                    src={s.avatar}
                    alt={s.name}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="ring" />
                </div>
                <span className="suspect-name">{s.name}</span>
              </button>
            );
          })}
        </div>

        {/* 질문/답변 */}
        <form className="qa-form" onSubmit={submit}>
          {questions.map((q) => (
            <label key={q.id} className="q-label">
              {q.label}
              {q.multiline ? (
                <textarea
                  className="q-textarea"
                  placeholder={q.placeholder}
                  rows={3}
                  value={answerMap[q.id] ?? ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  maxLength={q.maxLength}
                />
              ) : (
                <input
                  className="q-input"
                  placeholder={q.placeholder}
                  value={answerMap[q.id] ?? ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  maxLength={q.maxLength}
                />
              )}
            </label>
          ))}

          <div className="action-bar">
            <button className="submit-btn" type="submit">
              추리 결과 제출
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
