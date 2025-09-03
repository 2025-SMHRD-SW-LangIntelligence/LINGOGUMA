import { useLocation, useNavigate } from "react-router-dom";
import "@/shared/styles/LoginPage.css"; // 로그인/회원가입 공용 스타일
import lamp from "@/assets/images/lamp.png";

export default function SignupCompletePage() {
    const nav = useNavigate();
    const location = useLocation();
    const { userId, nickname } = (location.state as {
        userId: string;
        nickname: string;
    }) || {
        userId: "사용자",
        nickname: "알 수 없음",
    };

    return (
        <div className="auth auth--signup">
            {/* 배경 + 전등 + 스포트라이트 */}
            <div className="vignette" />
            <img className="lamp-login" src={lamp} alt="" aria-hidden="true" />
            <div className="spotlight" />

            {/* 카드 */}
            <div className="auth-card">
                <h1 className="auth-title">회원가입 완료</h1>

                <p className="auth-complete-msg">
                    <b>
                        {nickname} ({userId})
                    </b>
                    님, 회원 가입이 완료되었습니다.
                </p>

                <div className="auth-links">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => nav("/login")}
                    >
                        로그인 하러 가기
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => nav("/")}
                    >
                        홈으로
                    </button>
                </div>
            </div>
        </div>
    );
}
