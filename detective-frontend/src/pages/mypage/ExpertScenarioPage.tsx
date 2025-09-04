// src/pages/mypage/ExpertScenarioPage.tsx
import { useState } from "react";
import { api } from "../../shared/api/client";
import { useAuth } from "../../store/auth.store";
import "@/shared/styles/MyPage.css";

type Importance = "high" | "medium" | "low";

type CharacterForm = {
  name: string;
  occupation: string;
  personality: string;
  alibi: string;
  mission: string;
  speech_style: string;
  truth_tendency: string;
  outfit: string;
  sample_line: string;
  age?: string;
  gender?: "남성" | "여성" | "";
};

type ClueForm = {
  id: number;
  name: string;
  description: string;
  importance: Importance;
  attributes: string[];
};

type LocationForm = { id: number; name: string; description: string };
type TimelineForm = { id: number; time: string; event: string };

export default function ExpertScenarioPage() {
  const { user } = useAuth();

  const SUMMARY_MAX = 200;
  const CASE_SUMMARY_MAX = 120;
  const CASE_SUMMARY_WARN = 100;

  // ===== 상태 =====
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [level, setLevel] = useState(1);
  const [caseSummary, setCaseSummary] = useState("");

  const [characters, setCharacters] = useState<CharacterForm[]>([
    {
      name: "",
      occupation: "",
      personality: "",
      alibi: "",
      mission: "",
      speech_style: "",
      truth_tendency: "0.7",
      outfit: "",
      sample_line: "",
    },
    {
      name: "",
      occupation: "",
      personality: "",
      alibi: "",
      mission: "",
      speech_style: "",
      truth_tendency: "0.7",
      outfit: "",
      sample_line: "",
    },
  ]);
  const canAddCharacter = characters.length < 5;

  const [clues, setClues] = useState<ClueForm[]>([
    {
      id: 1,
      name: "",
      description: "",
      importance: "medium",
      attributes: [],
    },
  ]);
  const [locations, setLocations] = useState<LocationForm[]>([
    { id: 1, name: "", description: "" },
  ]);
  const [timeline, setTimeline] = useState<TimelineForm[]>([
    { id: 1, time: "", event: "" },
  ]);

  const [culpritIndex, setCulpritIndex] = useState<number>(0);
  const [answerMotive, setAnswerMotive] = useState("");
  const [answerMethod, setAnswerMethod] = useState("");
  const [answerKeyEvidenceIds, setAnswerKeyEvidenceIds] = useState<string[]>(
    []
  );

  // ===== 핸들러 (추가/삭제/수정) =====
  const addCharacter = () => {
    if (!canAddCharacter) return;
    setCharacters([
      ...characters,
      {
        name: "",
        occupation: "",
        personality: "",
        alibi: "",
        mission: "",
        speech_style: "",
        truth_tendency: "0.7",
        outfit: "",
        sample_line: "",
      },
    ]);
  };
  const updateCharacter = (
    index: number,
    field: keyof CharacterForm,
    value: string
  ) => {
    const updated = [...characters];
    (updated[index] as any)[field] = value;
    setCharacters(updated);
  };
  const removeCharacter = (index: number) => {
    if (characters.length <= 2) {
      alert("용의자는 최소 2명이어야 합니다.");
      return;
    }
    const updated = characters.filter((_, i) => i !== index);
    setCharacters(updated);
    if (culpritIndex >= updated.length)
      setCulpritIndex(Math.max(0, updated.length - 1));
  };

  const addClue = () => {
    setClues([
      ...clues,
      {
        id: clues.length + 1,
        name: "",
        description: "",
        importance: "medium",
        attributes: [],
      },
    ]);
  };
  const updateClue = (index: number, field: keyof ClueForm, value: any) => {
    const updated = [...clues];
    (updated[index] as any)[field] = value;
    setClues(updated);
  };
  const toggleClueAttr = (index: number, attr: string) => {
    const updated = [...clues];
    const attrs = updated[index].attributes;
    updated[index].attributes = attrs.includes(attr)
      ? attrs.filter((a) => a !== attr)
      : [...attrs, attr];
    setClues(updated);
  };
  const removeClue = (index: number) => {
    const updated = clues.filter((_, i) => i !== index);
    setClues(updated);
    const remainingIds = updated.map((_, i) => `e${i + 1}`);
    setAnswerKeyEvidenceIds((prev) =>
      prev.filter((id) => remainingIds.includes(id))
    );
  };

  const addLocation = () => {
    setLocations([
      ...locations,
      { id: locations.length + 1, name: "", description: "" },
    ]);
  };
  const updateLocation = (
    index: number,
    field: keyof LocationForm,
    value: string
  ) => {
    const updated = [...locations];
    (updated[index] as any)[field] = value;
    setLocations(updated);
  };
  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const addTimeline = () => {
    setTimeline([
      ...timeline,
      { id: timeline.length + 1, time: "", event: "" },
    ]);
  };
  const updateTimeline = (
    index: number,
    field: keyof TimelineForm,
    value: string
  ) => {
    const updated = [...timeline];
    (updated[index] as any)[field] = value;
    setTimeline(updated);
  };
  const removeTimeline = (index: number) => {
    setTimeline(timeline.filter((_, i) => i !== index));
  };

  // ===== JSON 조립 =====
  const buildContentJson = () => {
    const characterDocs = characters.map((c, i) => ({
      id: `suspect_${i + 1}`,
      name: c.name,
      role: "용의자",
      job: c.occupation,
      personality: c.personality,
      speaking_style: c.speech_style,
      truth_bias: Number(c.truth_tendency) || 0.7,
      alibi: { where: c.alibi, time_range: "", details: "" },
      mission: c.mission ?? "",
      outfit: c.outfit ?? "",
      sample_line: c.sample_line ?? "",
    }));

    const evidenceDocs = clues.map((cl, i) => ({
      id: `e${i + 1}`,
      name: cl.name || `단서 ${i + 1}`,
      desc: cl.description,
      importance: cl.importance.toUpperCase(),
      attributes: cl.attributes,
    }));

    const locationDocs = locations.map((loc) => ({
      id: `loc_${loc.id}`,
      name: loc.name,
      desc: loc.description,
    }));

    const timelineDocs = timeline.map((t) => ({
      id: `t_${t.id}`,
      time: t.time,
      event: t.event,
    }));

    const culpritId = `suspect_${culpritIndex + 1}`;

    const content = {
      scenario: {
        id: `scen_${Date.now()}`,
        title,
        summary: caseSummary || summary,
        difficulty: level,
        objective: "범인, 동기, 수법을 특정하고 핵심 증거를 제시하라.",
      },
      locations: locationDocs,
      timeline: timelineDocs,
      characters: characterDocs,
      evidence: evidenceDocs,
      answer: {
        culprit: culpritId,
        motive: answerMotive,
        method: answerMethod,
        key_evidence: answerKeyEvidenceIds,
      },
    };

    return JSON.stringify(content);
  };

  const handleCreateScenario = async () => {
    const contentJson = buildContentJson();
    try {
      await api.post("/scenarios/create", {
        scenTitle: title,
        scenSummary: summary,
        scenLevel: level,
        scenAccess: "FREE",
        contentJson,
      });
      alert("시나리오 작성 성공!");
    } catch {
      alert("시나리오 작성 실패");
    }
  };

  // ===== 권한 체크 =====
  if (!user || (user.role !== "EXPERT" && user.role !== "ADMIN")) {
    return <div className="form-error">전문가 권한이 필요한 메뉴입니다.</div>;
  }

  // ===== UI =====
  return (
    <div className="mypage-main">
      <section className="panel">
        <h2 className="panel-title">시나리오 작성</h2>

        {/* ===== 메타 정보 ===== */}
        <div className="form-group">
          <label>제목</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 사라진 고서"
          />
        </div>

        <div className="form-group">
          <label>사건 개요</label>
          <textarea
            className="textarea"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={SUMMARY_MAX}
          />
          <small>
            {summary.length}/{SUMMARY_MAX}자
          </small>
        </div>

        <div className="form-group">
          <label>난이도</label>
          <select
            className="select"
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
          >
            <option value={1}>쉬움</option>
            <option value={2}>보통</option>
            <option value={3}>어려움</option>
          </select>
        </div>

        <div className="form-group">
          <label>사건 요약</label>
          <textarea
            className="textarea"
            value={caseSummary}
            onChange={(e) => setCaseSummary(e.target.value)}
            maxLength={CASE_SUMMARY_MAX}
            style={{
              borderColor:
                caseSummary.length > CASE_SUMMARY_WARN ? "orange" : undefined,
            }}
          />
          <small>
            {caseSummary.length}/{CASE_SUMMARY_MAX}자
          </small>
        </div>

        {/* ===== 등장인물 ===== */}
        <h3>등장인물</h3>
        {characters.map((c, i) => (
          <div key={i} className="card">
            <input
              className="input"
              placeholder="이름"
              value={c.name}
              onChange={(e) => updateCharacter(i, "name", e.target.value)}
            />
            <input
              className="input"
              placeholder="직업"
              value={c.occupation}
              onChange={(e) => updateCharacter(i, "occupation", e.target.value)}
            />
            <input
              type="number"
              className="input"
              placeholder="나이"
              value={c.age || ""}
              onChange={(e) => updateCharacter(i, "age", e.target.value)}
            />
            <select
              className="select"
              value={c.gender || ""}
              onChange={(e) =>
                updateCharacter(i, "gender", e.target.value as any)
              }
            >
              <option value="">성별</option>
              <option value="남성">남성</option>
              <option value="여성">여성</option>
            </select>
            <input
              className="input"
              placeholder="성격"
              value={c.personality}
              onChange={(e) =>
                updateCharacter(i, "personality", e.target.value)
              }
            />
            <input
              className="input"
              placeholder="알리바이"
              value={c.alibi}
              onChange={(e) => updateCharacter(i, "alibi", e.target.value)}
            />
            <input
              className="input"
              placeholder="옷차림"
              value={c.outfit}
              onChange={(e) => updateCharacter(i, "outfit", e.target.value)}
            />
            <input
              className="input"
              placeholder="임무"
              value={c.mission}
              onChange={(e) => updateCharacter(i, "mission", e.target.value)}
            />
            <input
              className="input"
              placeholder="말투"
              value={c.speech_style}
              onChange={(e) =>
                updateCharacter(i, "speech_style", e.target.value)
              }
            />
            <input
              className="input"
              placeholder="진실 성향 (0~1)"
              value={c.truth_tendency}
              onChange={(e) =>
                updateCharacter(i, "truth_tendency", e.target.value)
              }
            />
            <input
              className="input"
              placeholder="샘플 대사"
              value={c.sample_line}
              onChange={(e) =>
                updateCharacter(i, "sample_line", e.target.value)
              }
            />
            <button
              className="btn btn-danger"
              onClick={() => removeCharacter(i)}
            >
              삭제
            </button>
          </div>
        ))}
        <button
          className="btn"
          onClick={addCharacter}
          disabled={!canAddCharacter}
        >
          캐릭터 추가
        </button>

        {/* ===== 단서 / 증거 ===== */}
        <h3>단서 / 증거</h3>
        {clues.map((cl, i) => (
          <div key={cl.id} className="card">
            <input
              className="input"
              placeholder="단서 이름"
              value={cl.name}
              onChange={(e) => updateClue(i, "name", e.target.value)}
            />
            <input
              className="input"
              placeholder="설명"
              value={cl.description}
              onChange={(e) => updateClue(i, "description", e.target.value)}
            />
            <select
              className="select"
              value={cl.importance}
              onChange={(e) =>
                updateClue(i, "importance", e.target.value as Importance)
              }
            >
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
            <div>
              {["시간 관련", "출입 기록", "동기 관련", "수법 관련"].map(
                (attr) => (
                  <label key={attr}>
                    <input
                      type="checkbox"
                      checked={cl.attributes.includes(attr)}
                      onChange={() => toggleClueAttr(i, attr)}
                    />{" "}
                    {attr}
                  </label>
                )
              )}
            </div>
            <button className="btn btn-danger" onClick={() => removeClue(i)}>
              삭제
            </button>
          </div>
        ))}
        <button className="btn" onClick={addClue}>
          단서 추가
        </button>

        {/* ===== 장소 ===== */}
        <h3>장소</h3>
        {locations.map((loc, i) => (
          <div key={loc.id} className="card">
            <input
              className="input"
              placeholder="장소 이름"
              value={loc.name}
              onChange={(e) => updateLocation(i, "name", e.target.value)}
            />
            <input
              className="input"
              placeholder="설명"
              value={loc.description}
              onChange={(e) => updateLocation(i, "description", e.target.value)}
            />
            <button
              className="btn btn-danger"
              onClick={() => removeLocation(i)}
            >
              삭제
            </button>
          </div>
        ))}
        <button className="btn" onClick={addLocation}>
          장소 추가
        </button>

        {/* ===== 타임라인 ===== */}
        <h3>타임라인</h3>
        {timeline.map((t, i) => (
          <div key={t.id} className="card">
            <input
              className="input"
              placeholder="시간"
              value={t.time}
              onChange={(e) => updateTimeline(i, "time", e.target.value)}
            />
            <input
              className="input"
              placeholder="사건"
              value={t.event}
              onChange={(e) => updateTimeline(i, "event", e.target.value)}
            />
            <button
              className="btn btn-danger"
              onClick={() => removeTimeline(i)}
            >
              삭제
            </button>
          </div>
        ))}
        <button className="btn" onClick={addTimeline}>
          타임라인 추가
        </button>

        {/* ===== 정답 설정 ===== */}
        <h3>정답 설정</h3>
        <select
          className="select"
          value={culpritIndex}
          onChange={(e) => setCulpritIndex(Number(e.target.value))}
        >
          {characters.map((c, i) => (
            <option value={i} key={i}>
              {c.name || `suspect_${i + 1}`}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="동기"
          value={answerMotive}
          onChange={(e) => setAnswerMotive(e.target.value)}
        />
        <input
          className="input"
          placeholder="수법"
          value={answerMethod}
          onChange={(e) => setAnswerMethod(e.target.value)}
        />

        <div>
          핵심 증거:
          {clues.map((cl, i) => (
            <label key={cl.id} style={{ marginRight: 12 }}>
              <input
                type="checkbox"
                checked={answerKeyEvidenceIds.includes(`e${i + 1}`)}
                onChange={() =>
                  setAnswerKeyEvidenceIds((prev) =>
                    prev.includes(`e${i + 1}`)
                      ? prev.filter((x) => x !== `e${i + 1}`)
                      : [...prev, `e${i + 1}`]
                  )
                }
              />
              {cl.name || `단서 ${i + 1}`}
            </label>
          ))}
        </div>

        {/* ===== 제출 버튼 ===== */}
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleCreateScenario}>
            시나리오 제출
          </button>
        </div>
      </section>
    </div>
  );
}
