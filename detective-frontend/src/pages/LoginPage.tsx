import { useState } from "react";
import { api } from "../shared/api/client";
import { useAuth } from "../store/auth.store";
import { Link, useNavigate } from "react-router-dom";

type Me = { nickname: string; id: string; index?: number };

export default function LoginPage() {
  const nav = useNavigate();
  const set = useAuth((s) => s.set);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");

    // 1) 로그인 → 2) /me 조회 → 3) 전역 상태 저장 → 4) 이동
    api
      .post("/users/login", { id, password })
      .then(() => api.get<Me>("/users/me"))
      .then(({ data }) => {
        set({ user: data });
        nav("/");
      })
      .catch((e: any) => {
        const msg =
          e?.response?.data?.message ??
          e?.response?.data ??
          e?.message ??
          "이메일 또는 비밀번호가 올바르지 않습니다.";
        setErr(typeof msg === "string" ? msg : "로그인에 실패했습니다.");
      });
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
      <h2>로그인</h2>
      <input
        placeholder="ID"
        value={id}
        onChange={(e) => setId(e.target.value)}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {err && <div style={{ color: "crimson" }}>{err}</div>}
      <button>로그인</button>
      <Link to="/signup">회원가입</Link>
    </form>
  );
}
