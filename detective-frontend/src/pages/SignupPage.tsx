import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../shared/api/client";

// 백엔드 SignUpRequest 형태: { id, email, password, nickname }

type Form = {
  id: string; // 로그인 아이디(문자열)
  email: string; // 이메일(인증용)
  password: string;
  nickname: string;
};

export default function SignupPage() {
  const nav = useNavigate();

  const [f, setF] = useState<Form>({
    id: "",
    email: "",
    password: "",
    nickname: "",
  });

  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [resentMsg, setResentMsg] = useState<string>("");

  const getErrMsg = (e: any, fallback: string) =>
    e?.response?.data?.message ?? e?.response?.data ?? e?.message ?? fallback;

  const validate = () => {
    if (!f.id.trim()) return "ID(로그인 아이디)를 입력해주세요.";
    if (!f.email.trim()) return "이메일을 입력해주세요.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
      return "이메일 형식이 올바르지 않습니다.";
    if (!f.nickname.trim()) return "닉네임을 입력해주세요.";
    if (f.password.length < 4) return "비밀번호는 4자 이상 입력해주세요.";
    return "";
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMsg("");
    setErr("");
    setResentMsg("");

    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    setLoading(true);
    api
      .post("/users/signup", f)
      .then(() => {
        setMsg(
          "가입 완료! 이메일 인증 메일을 확인해주세요. 인증 후 로그인 가능합니다."
        );
        // 필요하면 자동 이동:
        // nav("/login");
      })
      .catch((e) => {
        setErr(getErrMsg(e, "회원가입 중 오류가 발생했습니다."));
      })
      .finally(() => setLoading(false));
  };

  // 인증 메일 재발송
  const resendVerification = () => {
    setErr("");
    setResentMsg("");

    if (!f.email.trim()) {
      setErr("이메일을 입력한 뒤 재발송을 시도하세요.");
      return;
    }

    setLoading(true);
    api
      .post(`/users/resend-verification?email=${encodeURIComponent(f.email)}`)
      .then(() => {
        setResentMsg(
          "인증 메일을 재발송했습니다. 메일함(스팸함 포함)을 확인하세요."
        );
      })
      .catch((e) => {
        setErr(getErrMsg(e, "재발송 중 오류가 발생했습니다."));
      })
      .finally(() => setLoading(false));
  };

  // 테스트 편의용 자동 채우기
  const fillTest = () => {
    const rand = Math.floor(Math.random() * 10000);
    setF({
      id: `tester${rand}`,
      email: `tester${rand}@example.com`,
      password: "1234",
      nickname: "홍길동",
    });
    setMsg("");
    setErr("");
    setResentMsg("");
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 10, maxWidth: 360 }}>
      <h2>회원가입</h2>

      <input
        placeholder="ID (로그인 아이디)"
        value={f.id}
        onChange={(e) => setF({ ...f, id: e.target.value })}
        required
      />

      <input
        placeholder="Email (인증 메일 수신)"
        type="email"
        value={f.email}
        onChange={(e) => setF({ ...f, email: e.target.value })}
        required
      />

      <input
        placeholder="Nickname"
        value={f.nickname}
        onChange={(e) => setF({ ...f, nickname: e.target.value })}
        required
      />

      <input
        placeholder="Password"
        type="password"
        value={f.password}
        onChange={(e) => setF({ ...f, password: e.target.value })}
        required
      />

      {msg && <div style={{ color: "green" }}>{msg}</div>}
      {resentMsg && <div style={{ color: "green" }}>{resentMsg}</div>}
      {err && <div style={{ color: "crimson" }}>{err}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={loading}>
          {loading ? "처리 중..." : "가입"}
        </button>
        <button type="button" onClick={resendVerification} disabled={loading}>
          인증메일 재발송
        </button>
        <button type="button" onClick={() => nav("/login")}>
          로그인으로
        </button>
        <button type="button" onClick={fillTest}>
          테스트 데이터 채우기
        </button>
      </div>
    </form>
  );
}
