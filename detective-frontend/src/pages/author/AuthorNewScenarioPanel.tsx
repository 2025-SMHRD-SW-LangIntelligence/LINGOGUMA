// 새 시나리오 작성
// src/pages/author/AuthorNewScenarioPanel.tsx
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../shared/api/client";

type Suspect = {
  name: string;
  profile: string;
  isCulprit: boolean;
  personality: string;
  background: string;
  alibi: string;
  movements: string;
  notes: string;
};
type Clue = { title: string; description: string };
type Relation = { a: string; b: string; relation: string };

interface Props {
  onCancel: () => void;
  onCreated: (id: number) => void;
}

export default function AuthorNewScenarioPanel({ onCancel, onCreated }: Props) {
  // 기본 상태
  const [title, setTitle] = useState("");
  const [overview, setOverview] = useState("");

  // 피해자
  const [victimName, setVictimName] = useState("");
  const [victimProfile, setVictimProfile] = useState("");
  const [victimPersonality, setVictimPersonality] = useState("");
  const [victimFoundState, setVictimFoundState] = useState("");

  // 용의자/단서/관계
  const [suspects, setSuspects] = useState<Suspect[]>([
    {
      name: "",
      profile: "",
      isCulprit: false,
      personality: "",
      background: "",
      alibi: "",
      movements: "",
      notes: "",
    },
  ]);
  const [clues, setClues] = useState<Clue[]>([{ title: "", description: "" }]);
  const [relations, setRelations] = useState<Relation[]>([
    { a: "", b: "", relation: "" },
  ]);

  // 결론
  const [method, setMethod] = useState("");
  const [keyEvidence, setKeyEvidence] = useState("");
  const [motive, setMotive] = useState("");

  // 미리보기
  const [showPreview, setShowPreview] = useState(false);

  // 유효성
  const validate = () => {
    if (!title.trim()) return "제목은 필수입니다.";
    if (!overview.trim()) return "사건 개요는 필수입니다.";
    if (!victimName.trim()) return "피해자 이름은 필수입니다.";
    return null;
  };

  // JSON 직렬화
  const composeJson = () => {
    const culprit = suspects.find((s) => s.isCulprit)?.name ?? "";
    return {
      format: "scenario-json-v1",
      title,
      overview,
      victim: {
        name: victimName,
        profile: victimProfile,
        personality: victimPersonality,
        foundState: victimFoundState,
      },
      suspects,
      clues: clues.filter((c) => c.title || c.description),
      relations: relations.filter((r) => r.a && r.b && r.relation),
      conclusion: { culprit, method, keyEvidence, motive },
    };
  };

  // 제출
  const createScenario = useMutation({
    mutationFn: async () => {
      const msg = validate();
      if (msg) throw new Error(msg);
      const json = composeJson();
      const { data } = await api.post("/scenarios", {
        title,
        content: JSON.stringify(json),
      });
      return data;
    },
    onSuccess: (res) => {
      alert("시나리오가 제출되었습니다.");
      onCreated(res.id);
    },
    onError: (e: any) => {
      alert(e?.response?.data?.message || e?.message || "제출 중 오류 발생");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createScenario.mutate();
  };

  // 유틸
  const addSuspect = () =>
    setSuspects((prev) => [
      ...prev,
      {
        name: "",
        profile: "",
        isCulprit: false,
        personality: "",
        background: "",
        alibi: "",
        movements: "",
        notes: "",
      },
    ]);
  const removeSuspect = (i: number) =>
    setSuspects((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));

  const addClue = () => setClues((p) => [...p, { title: "", description: "" }]);
  const removeClue = (i: number) =>
    setClues((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));

  const addRelation = () =>
    setRelations((p) => [...p, { a: "", b: "", relation: "" }]);
  const removeRelation = (i: number) =>
    setRelations((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));

  // 렌더링
  return (
    <div style={{ maxWidth: 980, margin: "24px auto" }}>
      <h2>새 시나리오 작성</h2>

      <form onSubmit={onSubmit}>
        {/* 제목 */}
        <Section title="제목">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={input}
            placeholder="예) 도서관의 고요한 살인"
          />
        </Section>

        {/* 사건 개요 */}
        <Section title="사건 개요">
          <textarea
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            style={textareaTall}
          />
        </Section>

        {/* 피해자 */}
        <Section title="피해자">
          <div style={grid2}>
            <div>
              <label style={label}>이름</label>
              <input
                value={victimName}
                onChange={(e) => setVictimName(e.target.value)}
                style={input}
              />
            </div>
            <div>
              <label style={label}>정보(나이/직업 등)</label>
              <input
                value={victimProfile}
                onChange={(e) => setVictimProfile(e.target.value)}
                style={input}
              />
            </div>
          </div>
          <div style={grid2}>
            <div>
              <label style={label}>성격</label>
              <textarea
                value={victimPersonality}
                onChange={(e) => setVictimPersonality(e.target.value)}
                style={textarea}
              />
            </div>
            <div>
              <label style={label}>발견 당시/특이사항</label>
              <textarea
                value={victimFoundState}
                onChange={(e) => setVictimFoundState(e.target.value)}
                style={textarea}
              />
            </div>
          </div>
        </Section>

        {/* 용의자 */}
        <Section
          title={`용의자 (${suspects.length}명)`}
          action={
            <button type="button" onClick={addSuspect}>
              + 추가
            </button>
          }
        >
          {suspects.map((s, idx) => (
            <div key={idx} style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong>용의자 #{idx + 1}</strong>
                <label style={{ fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={s.isCulprit}
                    onChange={(e) =>
                      setSuspects((prev) =>
                        prev.map((it, i) =>
                          i === idx
                            ? { ...it, isCulprit: e.target.checked }
                            : it
                        )
                      )
                    }
                  />
                  범인 표시
                </label>
                <button
                  type="button"
                  onClick={() => removeSuspect(idx)}
                  disabled={suspects.length === 1}
                  style={{
                    background: "#e33",
                    color: "white", // ✅ 텍스트 색상 흰색
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 12px",
                    cursor: "pointer",
                  }}
                >
                  삭제
                </button>
              </div>

              <div style={grid2}>
                <div>
                  <label style={label}>이름</label>
                  <input
                    value={s.name}
                    onChange={(e) =>
                      setSuspects((prev) =>
                        prev.map((it, i) =>
                          i === idx ? { ...it, name: e.target.value } : it
                        )
                      )
                    }
                    style={input}
                  />
                </div>
                <div>
                  <label style={label}>프로필</label>
                  <input
                    value={s.profile}
                    onChange={(e) =>
                      setSuspects((prev) =>
                        prev.map((it, i) =>
                          i === idx ? { ...it, profile: e.target.value } : it
                        )
                      )
                    }
                    style={input}
                  />
                </div>
              </div>

              <div style={grid3}>
                <div>
                  <label style={label}>성격</label>
                  <textarea
                    value={s.personality}
                    onChange={(e) =>
                      setSuspects((prev) =>
                        prev.map((it, i) =>
                          i === idx
                            ? { ...it, personality: e.target.value }
                            : it
                        )
                      )
                    }
                    style={textarea}
                  />
                </div>
                <div>
                  <label style={label}>배경/갈등</label>
                  <textarea
                    value={s.background}
                    onChange={(e) =>
                      setSuspects((prev) =>
                        prev.map((it, i) =>
                          i === idx ? { ...it, background: e.target.value } : it
                        )
                      )
                    }
                    style={textarea}
                  />
                </div>
                <div>
                  <label style={label}>진술/알리바이</label>
                  <textarea
                    value={s.alibi}
                    onChange={(e) =>
                      setSuspects((prev) =>
                        prev.map((it, i) =>
                          i === idx ? { ...it, alibi: e.target.value } : it
                        )
                      )
                    }
                    style={textarea}
                  />
                </div>
              </div>

              <div style={grid2}>
                <div>
                  <label style={label}>행적</label>
                  <textarea
                    value={s.movements}
                    onChange={(e) =>
                      setSuspects((prev) =>
                        prev.map((it, i) =>
                          i === idx ? { ...it, movements: e.target.value } : it
                        )
                      )
                    }
                    style={textarea}
                  />
                </div>
                <div>
                  <label style={label}>단서/메모</label>
                  <textarea
                    value={s.notes}
                    onChange={(e) =>
                      setSuspects((prev) =>
                        prev.map((it, i) =>
                          i === idx ? { ...it, notes: e.target.value } : it
                        )
                      )
                    }
                    style={textarea}
                  />
                </div>
              </div>
            </div>
          ))}
        </Section>

        {/* 핵심 단서 */}
        <Section
          title={`핵심 단서 (${clues.length}개)`}
          action={
            <button type="button" onClick={addClue}>
              + 추가
            </button>
          }
        >
          {clues.map((c, idx) => (
            <div key={idx} style={row}>
              <input
                value={c.title}
                onChange={(e) =>
                  setClues((p) =>
                    p.map((it, i) =>
                      i === idx ? { ...it, title: e.target.value } : it
                    )
                  )
                }
                style={{ ...input, flex: 1 }}
                placeholder="단서명"
              />
              <input
                value={c.description}
                onChange={(e) =>
                  setClues((p) =>
                    p.map((it, i) =>
                      i === idx ? { ...it, description: e.target.value } : it
                    )
                  )
                }
                style={{ ...input, flex: 3 }}
                placeholder="설명"
              />
              <button type="button" onClick={() => removeClue(idx)}>
                삭제
              </button>
            </div>
          ))}
        </Section>

        {/* 용의자 간 관계 */}
        <Section
          title={`용의자 간 관계 (${relations.length}개)`}
          action={
            <button type="button" onClick={addRelation}>
              + 추가
            </button>
          }
        >
          {relations.map((r, idx) => (
            <div key={idx} style={row}>
              <input
                value={r.a}
                onChange={(e) =>
                  setRelations((p) =>
                    p.map((it, i) =>
                      i === idx ? { ...it, a: e.target.value } : it
                    )
                  )
                }
                style={{ ...input, flex: 1 }}
                placeholder="인물 A"
              />
              <input
                value={r.b}
                onChange={(e) =>
                  setRelations((p) =>
                    p.map((it, i) =>
                      i === idx ? { ...it, b: e.target.value } : it
                    )
                  )
                }
                style={{ ...input, flex: 1 }}
                placeholder="인물 B"
              />
              <input
                value={r.relation}
                onChange={(e) =>
                  setRelations((p) =>
                    p.map((it, i) =>
                      i === idx ? { ...it, relation: e.target.value } : it
                    )
                  )
                }
                style={{ ...input, flex: 3 }}
                placeholder="관계 설명"
              />
              <button type="button" onClick={() => removeRelation(idx)}>
                삭제
              </button>
            </div>
          ))}
        </Section>

        {/* 결론 요약 */}
        <Section title="결론 요약">
          <div style={grid3}>
            <textarea
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              style={textarea}
              placeholder="수법"
            />
            <textarea
              value={keyEvidence}
              onChange={(e) => setKeyEvidence(e.target.value)}
              style={textarea}
              placeholder="핵심 단서"
            />
            <textarea
              value={motive}
              onChange={(e) => setMotive(e.target.value)}
              style={textarea}
              placeholder="동기"
            />
          </div>
        </Section>

        {/* 액션 */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            type="submit"
            disabled={createScenario.isPending}
            style={btnPrimary}
          >
            {createScenario.isPending ? "제출 중…" : "시나리오 제출"}
          </button>
          <button type="button" onClick={onCancel} style={btnGhost}>
            취소
          </button>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            style={{ ...btn, marginLeft: "auto" }}
          >
            {showPreview ? "미리보기 숨기기" : "미리보기 보기"}
          </button>
        </div>
      </form>

      {showPreview && (
        <pre style={preview}>{JSON.stringify(composeJson(), null, 2)}</pre>
      )}
    </div>
  );
}

/* ---------- 스타일 ---------- */
const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#666",
  marginBottom: 6,
};
const input: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%", // ✅ 부모 영역 넘지 않도록
  padding: 8,
  border: "1px solid #ddd",
  borderRadius: 6,
  boxSizing: "border-box", // ✅ border + padding 포함 크기 조절
};
const textarea: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%", // ✅ 부모 영역 넘지 않도록
  minHeight: 90,
  padding: 8,
  border: "1px solid #ddd",
  borderRadius: 6,
  boxSizing: "border-box",
};
const textareaTall: React.CSSProperties = { ...textarea, minHeight: 140 };
const row: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginBottom: 8,
  alignItems: "center",
};
const grid2: React.CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "1fr 1fr",
};
const grid3: React.CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "1fr 1fr 1fr",
};
const card: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 8,
  padding: 12,
  marginBottom: 12,
  background: "#fafafa",
  color: "#000",
};
const preview: React.CSSProperties = {
  marginTop: 12,
  background: "#0b1020",
  color: "#c8e1ff",
  padding: 12,
  borderRadius: 8,
};
const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #ccc",
  cursor: "pointer",
};
const btnPrimary: React.CSSProperties = {
  ...btn,
  background: "#2d6cdf",
  borderColor: "#2d6cdf",
  color: "white",
};
const btnGhost: React.CSSProperties = { ...btn };

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section style={{ margin: "18px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
