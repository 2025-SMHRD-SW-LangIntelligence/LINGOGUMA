import { useNavigate } from "react-router-dom";
import "./LobbyPage.css";

// 이미지 경로는 프로젝트에 맞게 수정
import lamp from "../assets/lamp.png";
import logo from "../assets/logo-thecase.png";

export default function LobbyPage() {
  const navigate = useNavigate();

  const handleStart = () => {
    // TODO: 로그인 여부에 따라 분기하고 싶다면 zustand 스토어와 연동
    // ex) const isAuthed = useAuthStore.getState().token != null;
    // navigate(isAuthed ? "/scenarios" : "/login");
    navigate("/scenarios"); // 임시: 시나리오 선택(혹은 게임 시작) 경로로 이동
  };

  return (
    <div className="lobby">
      <div className="vignette" />
      <img className="lamp" src={lamp} alt="Lamp" />
      <div className="spotlight" />
      <img className="logo" src={logo} alt="THE CASE" />

      <div className="cta">
        <button className="btn btn-start" type="button" onClick={handleStart}>
          시작하기
        </button>
        <div className="auth-row">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => navigate("/login")}
          >
            로그인
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => navigate("/signup")}
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}
