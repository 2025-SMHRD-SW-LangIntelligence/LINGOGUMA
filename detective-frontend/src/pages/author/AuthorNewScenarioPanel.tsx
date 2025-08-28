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
  onCancel: () => void; // 취소 시 부모에서 탭 이동
}

export default function AuthorNewScenarioPanel({ onCancel }: Props) {
  // 기본 폼 상태
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
      title: title.trim(),
      overview: overview.trim(),
      victim: {
        name: victimName.trim(),
        profile: victimProfile.trim(),
        personality: victimPersonality.trim(),
        foundState: victimFoundState.trim(),
      },
      suspects: suspects.map((s) => ({
        name: s.name.trim(),
        profile: s.profile.trim(),
        isCulprit: !!s.isCulprit,
        personality: s.personality.trim(),
        background: s.background.trim(),
        alibi: s.alibi.trim(),
        movements: s.movements.trim(),
        notes: s.notes.trim(),
      })),
      clues: clues
        .filter((c) => c.title.trim() || c.description.trim())
        .map((c) => ({
          title: c.title.trim(),
          description: c.description.trim(),
        })),
      relations: relations
        .filter((r) => r.a.trim() && r.b.trim() && r.relation.trim())
        .map((r) => ({
          a: r.a.trim(),
          b: r.b.trim(),
          relation: r.relation.trim(),
        })),
      conclusion: {
        culprit,
        method: method.trim(),
        keyEvidence: keyEvidence.trim(),
        motive: motive.trim(),
      },
    };
  };

  const createScenario = useMutation({
    mutationFn: async () => {
      const msg = validate();
      if (msg) throw new Error(msg);
      const json = composeJson();
      await api.post("/scenarios", {
        title,
        content: JSON.stringify(json),
      });
    },
    onSuccess: () => {
      alert("초안이 제출되었습니다.");
      onCancel();
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "제출 중 오류가 발생했습니다.";
      alert(msg);
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createScenario.mutate();
  };

  // --- 유틸 함수들 (add/remove)
  const addSuspect = () =>
    setSuspects((prev) => [
      ...prev,
      { ...prev[0], name: "", profile: "", isCulprit: false },
    ]);
  const removeSuspect = (idx: number) =>
    setSuspects((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev
    );

  const addClue = () =>
    setClues((prev) => [...prev, { title: "", description: "" }]);
  const removeClue = (idx: number) =>
    setClues((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev
    );

  const addRelation = () =>
    setRelations((prev) => [...prev, { a: "", b: "", relation: "" }]);
  const removeRelation = (idx: number) =>
    setRelations((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev
    );

  return (
    <div style={{ maxWidth: 980, margin: "24px auto" }}>
      <h2>새 시나리오 작성 (JSON 템플릿)</h2>

      <form onSubmit={onSubmit}>
        {/* 제목 */}
        <Section title="제목">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예) 도서관의 고요한 살인"
            style={input}
          />
        </Section>

        {/* 사건 개요 */}
        <Section title="사건 개요">
          <textarea
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            placeholder="사건 장소/시간대, 개요, 수사 포인트 등을 요약"
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

        {/* ... (용의자 / 단서 / 관계 / 결론 요약 부분 동일) ... */}

        {/* 액션 */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
            alignItems: "center",
          }}
        >
          <button
            type="submit"
            disabled={createScenario.isPending}
            style={btnPrimary}
          >
            {createScenario.isPending ? "제출 중…" : "초안 제출"}
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

/* ---------- 스타일 & 섹션 ---------- */
const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#666",
  marginBottom: 6,
};
const input: React.CSSProperties = {
  width: "100%",
  padding: 8,
  border: "1px solid #ddd",
  borderRadius: 6,
};
const textarea: React.CSSProperties = {
  width: "100%",
  minHeight: 90,
  padding: 8,
  border: "1px solid #ddd",
  borderRadius: 6,
};
const textareaTall: React.CSSProperties = { ...textarea, minHeight: 140 };
const grid2: React.CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "1fr 1fr",
  marginTop: 6,
};
const preview: React.CSSProperties = {
  marginTop: 12,
  background: "#0b1020",
  color: "#c8e1ff",
  padding: 12,
  borderRadius: 8,
  border: "1px solid #223",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #ccc",
  background: "white",
  cursor: "pointer",
};
const btnPrimary: React.CSSProperties = {
  ...btn,
  background: "#2d6cdf",
  borderColor: "#2d6cdf",
  color: "white",
};
const btnGhost: React.CSSProperties = { ...btn, background: "white" };

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
        <h3 style={{ margin: "0 0 6px" }}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
