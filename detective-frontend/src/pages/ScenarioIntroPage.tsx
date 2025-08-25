import { useParams, useNavigate } from "react-router-dom";
import { SCENARIOS } from "../shared/types/case"; // ✅ case.ts에서 import
import "./ScenarioIntroPage.css";

export default function ScenarioIntroPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();

  const scenario = SCENARIOS.find((s) => s.id === scenarioId);

  if (!scenario) {
    return <div className="scenario-intro">존재하지 않는 시나리오입니다.</div>;
  }

  return (
    <div className="scenario-intro">
      <h2 className="title">{scenario.title}</h2>
      <img className="intro-image" src={scenario.image} alt={scenario.title} />
      <p className="description">{scenario.description}</p>
      <button
        className="start-btn"
        onClick={() => navigate(`/play/${scenario.id}`)}
      >
        시작하기
      </button>
    </div>
  );
}
