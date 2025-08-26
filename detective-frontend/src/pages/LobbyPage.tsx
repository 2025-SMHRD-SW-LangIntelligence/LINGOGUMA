import { useNavigate } from "react-router-dom";
import "./LobbyPage.css";

import lamp from "../assets/lamp.png";
import logo from "../assets/logo-thecase.png";

import { useAuth } from "../store/auth.store";

export default function LobbyPage() {
  const navigate = useNavigate();
  const { user } = useAuth(); // ✅ 로그인 여부 확인

  const handleStart = () => {
    if (user) {
      navigate("/scenarios"); // 로그인 → 시나리오 선택
    } else {
      navigate("/login"); // 비로그인 → 로그인 페이지
    }
  };

  return (
    <div className="lobby">
      <div className="vignette" />
      <img className="lamp" src={lamp} alt="Lamp" />
      <div className="spotlight" />
      <img className="logo" src={logo} alt="THE CASE" />

      <div className="cta">
        {/* 시작하기 버튼 */}
        <button className="btn btn-start" type="button" onClick={handleStart}>
          시작하기
        </button>

        {/* ✅ 비로그인일 때만 로그인/회원가입 표시 */}
        {!user && (
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
        )}
      </div>
    </div>
  );
}
