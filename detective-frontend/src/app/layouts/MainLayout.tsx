// src/layouts/MainLayout.tsx
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/auth.store";
import { useEffect } from "react";
import { api } from "../../shared/api/client";

type Me = { nickname: string; id: string; index?: number };

export default function MainLayout() {
  const { user, logout, set } = useAuth();
  const nav = useNavigate();

  // 세션 기반이므로 최초 진입/새로고침 시 /me로 프로필 동기화
  useEffect(() => {
    const hasProfile =
      user &&
      typeof user === "object" &&
      (user as any).nickname &&
      (user as any).id;

    if (hasProfile) return;

    api
      .get<Me>("/users/me")
      .then(({ data }) => {
        if (data && data.nickname) set({ user: data });
      })
      .catch(() => {
        /* 비로그인(401) 등은 무시 */
      });
  }, [user, set]);

  const handleLogout = async () => {
    try {
      await api.post("/users/logout"); // 서버 세션 만료
    } catch {
      /* 네트워크 오류는 무시하고 클라이언트 상태만 정리 */
    }
    logout();
    // nav("/login"); // 필요하면 사용
  };

  // 표시 문자열: nickname(id)님
  const displayName =
    user && typeof user === "object"
      ? `${(user as any).nickname ?? "User"}${
          (user as any).id ? `(${(user as any).id})` : ""
        }`
      : "User님";

  return (
    <div>
      <header style={{ padding: 12, borderBottom: "1px solid #eee" }}>
        <Link to="/">Lobby</Link> ·<Link to="/scenarios">Scenarios</Link> ·
        <Link to="/me">My</Link> ·
        {user ? (
          <>
            <span style={{ marginLeft: 8 }}>{displayName}</span>
            <button
              onClick={handleLogout}
              style={{
                marginLeft: 8,
                border: "none",
                background: "transparent",
                color: "blue",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </header>
      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
