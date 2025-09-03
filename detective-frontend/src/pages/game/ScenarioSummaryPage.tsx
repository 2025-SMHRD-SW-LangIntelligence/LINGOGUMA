import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/shared/api/client";
import { useAuth } from "@/store/auth.store";
import "@/shared/styles/ScenarioSummaryPage.css";

import defaultHero from "@/assets/images/intro/s1.png"; // 기본 배너 이미지 (없으면 대체)
import avatar1 from "@/assets/images/avatars/s1_1.png";
import avatar2 from "@/assets/images/avatars/s1_2.png";
import avatar3 from "@/assets/images/avatars/s1_3.png";

const fallbackAvatars = [avatar1, avatar2, avatar3];

type Character = {
  name: string;
  role: string;
  avatar?: string;
};

type ScenarioDetail = {
  scenIdx: number;
  scenTitle: string;
  scenSummary: string;
  scenLevel: number;
  scenAccess: "FREE" | "MEMBER";
  contentJson?: string | any;
};

export default function ScenarioSummaryPage() {
  const nav = useNavigate();
  const { scenarioId = "" } = useParams<{ scenarioId: string }>();
  const { user } = useAuth();

  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const [loading, setLoading] = useState(true);

  /* 시나리오 불러오기 */
  useEffect(() => {
    const fetchScenario = async () => {
      try {
        if (!scenarioId) return;
        const res = await api.get<ScenarioDetail>(`/scenarios/${scenarioId}`);
        setScenario(res.data);
      } catch (err) {
        console.error("시나리오 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchScenario();
  }, [scenarioId]);

  /* contentJson 파싱 */
  const content = useMemo(() => {
    if (!scenario?.contentJson) return {};
    try {
      return typeof scenario.contentJson === "string"
        ? JSON.parse(scenario.contentJson)
        : scenario.contentJson;
    } catch {
      return {};
    }
  }, [scenario]);

const suspects: Character[] = useMemo(() => {
  if (!Array.isArray(content?.characters)) return [];
  return content.characters.map((c: any, idx: number) => ({
    ...c,
    avatar: c.avatar || fallbackAvatars[idx] || "", // 없으면 임시 이미지
  }));
}, [content]);

  const hero = content?.hero || defaultHero;

  /* 시작하기 → 세션 생성 후 이동 */
  const start = async () => {
    try {
      if (!scenario) return;
      // 로그인 필요 여부 확인
      if (scenario.scenAccess === "MEMBER" && !user?.userIdx) {
        alert("로그인이 필요한 시나리오입니다.");
        return;
      }
      const res = await api.post<number>(
        "/game/session/start",
        null,
        { params: { scenIdx: scenario.scenIdx, userIdx: user?.userIdx } }
      );
      const sessionId = res.data;
      nav(`/play/${scenario.scenIdx}?sessionId=${sessionId}`);
    } catch (err) {
      console.error("세션 시작 실패:", err);
      alert("세션 시작에 실패했습니다.");
    }
  };

  const backToList = () => nav("/scenarios");

  if (loading) {
    return (
      <div className="intro-root">
        <div className="intro-loading">불러오는 중…</div>
      </div>
    );
  }
  if (!scenario) {
    return (
      <div className="intro-root">
        <div className="intro-loading">시나리오 정보를 가져오지 못했어요.</div>
      </div>
    );
  }

  return (
    <div className="intro-root">
      <div className="intro-panel">
        {/* 상단 제목 */}
        <div className="intro-head">
          <h1 className="intro-title">{scenario.scenTitle}</h1>
        </div>

        {/* 큰 배너 */}
        <div className="intro-hero">
          <img
            src={hero}
            alt="scenario hero"
            onError={(e) => {
              e.currentTarget.src = defaultHero;
            }}
          />
        </div>

        {/* 설명 */}
        <section className="intro-desc">
          <p>{scenario.scenSummary || "시나리오 설명이 없습니다."}</p>
        </section>

        {/* 용의자 미리보기 */}
        {suspects.length > 0 && (
        <>
            <h2 className="intro-subtitle">용의자</h2>
            <div className="intro-suspects">
            {suspects.map((s, idx) => (
                <figure className="intro-suspect" key={idx}>
                <div className="intro-avatar">
                    <img
                    src={s.avatar}
                    alt={s.name}
                    onError={(e) => {
                        e.currentTarget.src = fallbackAvatars[idx] || defaultHero;
                    }}
                    />
                </div>
                <figcaption>{s.name}</figcaption>
                </figure>
            ))}
            </div>
        </>
        )}

        {/* 하단 버튼 */}
        <div className="intro-actions">
          <button className="btn-outline" onClick={backToList}>
            목록으로
          </button>
          <button className="btn-primary" onClick={start}>
            시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
