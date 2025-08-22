import { useState } from "react";
import { api } from "../shared/api/client";
import { useAuth } from "../store/auth.store";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css"; // ← 추가
import lamp from "../assets/lamp.png";

export default function LoginPage() {
  const nav = useNavigate();
  const set = useAuth((s) => s.set);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      const { data } = await api.post("/users/login", { id, password });
      set({ user: data }); // 세션 기반
      nav("/");
    } catch {
      setErr("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <div className="auth">
      <img className="lamp-login" src={lamp} alt="" aria-hidden="true" />
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1 className="auth-title">로그인</h1>

        <div className="field">
          <label htmlFor="login-id">아이디</label>
          <input
            id="login-id"
            className="input"
            placeholder="아이디"
            value={id}
            onChange={(e) => setId(e.target.value)}
            autoComplete="username"
          />
        </div>

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

        {err && (
          <div className="form-error" role="alert">
            {err}
          </div>
        )}

        <button type="submit" className="btn btn-primary">
          로그인
        </button>

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
