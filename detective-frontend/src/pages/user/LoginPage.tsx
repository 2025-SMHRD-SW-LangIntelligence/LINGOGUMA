// src/pages/LoginPage.tsx
import { useState } from "react";
import { api } from "@/shared/api/client";
import { useAuth } from "@/store/auth.store";
import { Link, useNavigate } from "react-router-dom";
import "@/shared/styles/LoginPage.css";
import lamp from "@/assets/images/lamp.png";

export default function LoginPage() {
    const nav = useNavigate();
    const set = useAuth((s) => s.set);
    const [userId, setUserId] = useState(""); // 내 코드 기준 userId
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr("");

        try {
            // 1) 로그인 요청 → 세션 쿠키 생성
            await api.post("/users/login", { userId, password });

            // 2) 내 정보 조회 (백엔드 /users/me API가 반환하는 user DTO 구조 사용)
            const { data } = await api.get("/users/me");

            // 3) 전역 auth store에 저장
            set({ user: data });

            // 4) 이동
            nav("/");
        } catch {
            setErr("아이디 또는 비밀번호가 올바르지 않습니다.");
        }
    };

    return (
        <div className="auth">
            {/* 상단 램프 이미지 */}
            <img className="lamp-login" src={lamp} alt="" aria-hidden="true" />

            <form className="auth-card" onSubmit={submit} noValidate>
                <h1 className="auth-title">로그인</h1>

                {/* 아이디 입력 */}
                <div className="field">
                    <label htmlFor="login-id">아이디</label>
                    <input
                        id="login-id"
                        className="input"
                        placeholder="아이디"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        autoComplete="username"
                    />
                </div>

                {/* 비밀번호 입력 */}
                <div className="field">
                    <label htmlFor="login-pw">비밀번호</label>
                    <input
                        id="login-pw"
                        className="input"
                        placeholder="비밀번호"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        aria-invalid={!!err}
                    />
                </div>

                {/* 에러 메시지 */}
                {err && (
                    <div className="form-error" role="alert">
                        {err}
                    </div>
                )}

                {/* 로그인 버튼 */}
                <button type="submit" className="btn btn-primary">
                    로그인
                </button>

                {/* 링크 영역 */}
                <div className="auth-links">
                    <Link className="link" to="/signup">
                        회원가입
                    </Link>
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => nav("/")}
                    >
                        홈으로
                    </button>
                </div>
            </form>
        </div>
    );
}
