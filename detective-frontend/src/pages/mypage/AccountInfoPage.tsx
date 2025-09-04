import { useMemo, useState } from "react";
import { useAuth } from "@/store/auth.store";
import { api } from "@/shared/api/client";
import "@/shared/styles/MyPage.css";

export default function AccountInfoPage() {
  const { user, set, logout } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [busy, setBusy] = useState<null | "nick" | "pw">(null);

  const pwMatch = useMemo(
    () => password !== "" && password === password2,
    [password, password2]
  );
  const canChangePw = pwMatch && busy !== "pw";

  const handleUpdateNickname = async () => {
    if (!nickname.trim()) return alert("닉네임을 입력해 주세요.");
    try {
      setBusy("nick");
      await api.post("/users/update-nickname", { nickname: nickname.trim() });
      alert("닉네임 변경 성공!");
      // user가 있을 때만 안전하게 갱신
      if (user) set({ user: { ...user, nickname: nickname.trim() } });
    } catch {
      alert("닉네임 변경 실패");
    } finally {
      setBusy(null);
    }
  };

  const handleUpdatePassword = async () => {
    if (!pwMatch) return alert("두 비밀번호가 일치하지 않습니다.");
    try {
      setBusy("pw");
      await api.post("/users/update-password", { password });
      alert("비밀번호 변경 성공!");
      setPassword("");
      setPassword2("");
    } catch {
      alert("비밀번호 변경 실패");
    } finally {
      setBusy(null);
    }
  };

  const handleLogout = () => {
    api.post("/users/logout").finally(() => {
      logout();
      window.location.href = "/login";
    });
  };

  return (
    <section className="account-section">
      <h3 className="mypage-section-title">계정 정보</h3>

      {/* 프로필 요약 카드 */}
      <div className="account-card">
        <div className="account-card-header">
          <span className="account-card-title">프로필</span>
        </div>
        <div className="account-card-body">
          <div className="account-profile-grid">
            <div className="k">아이디</div>
            <div className="v">{user?.userId ?? "-"}</div>
            <div className="k">닉네임</div>
            <div className="v">{user?.nickname ?? "-"}</div>
            <div className="k">권한</div>
            <div className="v">{user?.role ?? "-"}</div>
          </div>
        </div>
      </div>

      {/* 닉네임 변경 */}
      <div className="account-card">
        <div className="account-card-header">
          <span className="account-card-title">닉네임 변경</span>
        </div>
        <div className="account-card-body">
          <div className="account-form-row">
            <label htmlFor="nickname" className="account-label">
              닉네임
            </label>
            <input
              id="nickname"
              type="text"
              className="account-input account-input-sm"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="새 닉네임"
            />
            <button
              type="button"
              className="account-btn account-btn-primary account-btn-sm"
              onClick={handleUpdateNickname}
              disabled={busy === "nick"}
            >
              {busy === "nick" ? "변경 중…" : "변경"}
            </button>
          </div>
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <div className="account-card">
        <div className="account-card-header">
          <span className="account-card-title">비밀번호 변경</span>
          <span className="account-card-note">8자 이상 권장</span>
        </div>
        <div className="account-card-body">
          <div className="account-form-row">
            <label htmlFor="password" className="account-label">
              새 비밀번호
            </label>
            <input
              id="password"
              type="password"
              className="account-input account-input-sm"
              value={password}
              placeholder="새 비밀번호 입력"
              onChange={(e) => setPassword(e.target.value)}
            />
            {/* 빈 칸: 버튼은 2행에 둠 */}
            <div />
          </div>

          {/* 2행: 새 비밀번호 확인 + 버튼 */}
          <div className="account-form-row">
            <label htmlFor="password2" className="account-label">
              새 비밀번호 확인
            </label>
            <input
              id="password2"
              type="password"
              className="account-input account-input-sm"
              value={password2}
              placeholder="한 번 더 입력"
              onChange={(e) => setPassword2(e.target.value)}
            />
            <button
              type="button"
              className="account-btn account-btn-primary account-btn-sm"
              onClick={handleUpdatePassword}
              disabled={!canChangePw}
              aria-disabled={!canChangePw}
              title={
                !canChangePw
                  ? "두 칸이 같아야 변경할 수 있어요"
                  : "비밀번호 변경"
              }
            >
              {busy === "pw" ? "변경 중…" : "변경"}
            </button>
          </div>
        </div>
      </div>

      {/* 로그아웃 (선택) */}
      {/* <div className="account-actions">
        <button className="account-btn account-btn-ghost account-btn-sm" onClick={handleLogout}>
          로그아웃
        </button>
      </div> */}
    </section>
  );
}
