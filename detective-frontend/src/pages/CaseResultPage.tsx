import { useMemo, useState } from "react";
import type { Suspect, Question } from "../shared/types/case";
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
        <h2 className="summary-title">사건의 전말</h2>

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
                    loading="lazy" // ✅ 지연 로딩
                    decoding="async" // ✅ 비동기 디코딩
                  />
                  <div className="ring" />
                </div>
                <span className="suspect-name">{s.name}</span>
              </button>
            );
          })}
        </div>

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
