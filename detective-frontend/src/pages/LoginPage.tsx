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

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");
    try {
      // 1) 로그인: 세션 쿠키가 생성됨 (client.ts에 withCredentials=true 필요)
      await api.post("/users/login", { id, password });

      // 2) 내 정보 조회: { nickname, id, index } 형태여야 함
      const { data } = await api.get<Me>("/users/me");

      // 3) 전역 스토어에 저장 → 헤더에서 nickname(id)님 표시 가능
      set({ user: data });

      // 4) 이동
      nav("/");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ??
        e?.response?.data ??
        e?.message ??
        "이메일 또는 비밀번호가 올바르지 않습니다.";
      setErr(typeof msg === "string" ? msg : "로그인에 실패했습니다.");
    }
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
