// src/pages/SignupPage.tsx
import { useState } from "react";
import { api } from "@/shared/api/client";
import { Link, useNavigate } from "react-router-dom";
import "@/shared/styles/LoginPage.css"; // 로그인/회원가입 공용 스타일
import lamp from "@/assets/images/lamp.png";

export default function SignupPage() {
    const nav = useNavigate();
    const [form, setForm] = useState({
        userId: "",
        nickname: "",
        email: "",
        password: "",
        confirm: "",
    });
    const [err, setErr] = useState<string | null>(null);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);

        // 간단한 클라이언트 검증
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            setErr("올바른 이메일 형식이 아닙니다.");
            return;
        }
        if (form.password.length < 6) {
            setErr("비밀번호는 6자 이상이어야 합니다.");
            return;
        }
        if (form.password !== form.confirm) {
            setErr("비밀번호가 일치하지 않습니다.");
            return;
        }

        try {
            // 백엔드 API 연동 (내 뼈대 로직 유지)
            await api.post("/users/signup", {
                userId: form.userId,
                email: form.email,
                password: form.password,
                nickname: form.nickname,
            });

            // 가입 완료 후 완료 페이지로 이동
            nav("/signup/complete", {
                state: { userId: form.userId, nickname: form.nickname },
            });
        } catch (e: any) {
            if (e.response && e.response.data) {
                setErr(e.response.data);
            } else {
                setErr(
                    "회원가입에 실패했습니다. 이미 사용 중인 아이디/이메일일 수 있어요."
                );
            }
        }
    };

    return (
        <div className="auth auth--signup">
            {/* 배경 + 전등 + 스포트라이트 */}
            <div className="vignette" />
            <img className="lamp-login" src={lamp} alt="" aria-hidden="true" />
            <div className="spotlight" />

            <form className="auth-card" onSubmit={submit} noValidate>
                <h1 className="auth-title">회원가입</h1>

                <div className="field">
                    <label htmlFor="signup-id">아이디</label>
                    <input
                        id="signup-id"
                        name="userId"
                        className="input"
                        placeholder="아이디"
                        value={form.userId}
                        onChange={onChange}
                        autoComplete="username"
                        required
                    />
                </div>

                <div className="field">
                    <label htmlFor="signup-nickname">닉네임</label>
                    <input
                        id="signup-nickname"
                        name="nickname"
                        className="input"
                        placeholder="닉네임"
                        value={form.nickname}
                        onChange={onChange}
                    />
                </div>

                <div className="field">
                    <label htmlFor="signup-email">이메일</label>
                    <input
                        id="signup-email"
                        name="email"
                        type="email"
                        className="input"
                        placeholder="이메일"
                        value={form.email}
                        onChange={onChange}
                        autoComplete="email"
                        required
                    />
                </div>

                <div className="field">
                    <label htmlFor="signup-pw">비밀번호</label>
                    <input
                        id="signup-pw"
                        name="password"
                        type="password"
                        className="input"
                        placeholder="비밀번호"
                        value={form.password}
                        onChange={onChange}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <div className="field">
                    <label htmlFor="signup-confirm">비밀번호 확인</label>
                    <input
                        id="signup-confirm"
                        name="confirm"
                        type="password"
                        className="input"
                        placeholder="비밀번호 확인"
                        value={form.confirm}
                        onChange={onChange}
                        autoComplete="new-password"
                        aria-invalid={!!err}
                        required
                    />
                </div>

                {err && (
                    <div className="form-error" role="alert">
                        {err}
                    </div>
                )}

                <button type="submit" className="btn btn-primary">
                    회원가입
                </button>

                <div className="auth-links">
                    <Link className="link" to="/login">
                        로그인으로
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
