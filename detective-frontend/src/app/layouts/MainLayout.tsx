// src/app/layouts/MainLayout.tsx
import { Outlet, NavLink, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useAuth } from "../../store/auth.store";
import { api } from "../../shared/api/client";

export default function MainLayout() {
  const { user, logout, set } = useAuth();
  const nav = useNavigate();
  const { scenarioId } = useParams(); // URL에 :scenarioId가 있을 때만 값 존재
  const hydrated = useRef(false);

  // 새로고침 시 세션 하이드레이트: 세션 쿠키(JSESSIONID)가 있으면 /me가 200을 반환
  useEffect(() => {
    if (hydrated.current) return;
    if (!user) {
      api
        .get("/users/me")
        .then(({ data }) => {
          // { nickname, id, index, role } 형태 기대
          if (data?.nickname) set({ user: data });
        })
        .catch(() => {
          // 미로그인(401) 등은 무시
        })
        .finally(() => {
          hydrated.current = true;
        });
    } else {
      hydrated.current = true;
    }
  }, [user, set]);

  const handleLogout = async () => {
    try {
      await api.post("/users/logout"); // 서버 세션 무효화
    } catch {}
    logout(); // 클라이언트 스토어 정리
    nav("/login"); // 로그아웃 시 로그인 페이지로 이동
  };

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    fontWeight: isActive ? 700 : 400,
    textDecoration: "none",
    color: "#333",
    marginRight: 8,
  });

  return (
    <div>
      <header style={{ padding: 12, borderBottom: "1px solid #eee" }}>
        <NavLink to="/" style={linkStyle}>
          Lobby
        </NavLink>{" "}
        ·
        <NavLink to="/scenarios" style={linkStyle}>
          Scenarios
        </NavLink>{" "}
        ·
        <NavLink to="/me" style={linkStyle}>
          My
        </NavLink>
        {/* 현재 경로에 :scenarioId가 있을 때만 Summary/Result 메뉴 노출 */}
        {scenarioId && (
          <>
            {" "}
            ·{" "}
            <NavLink to={`/play/${scenarioId}/summary`} style={linkStyle}>
              Summary
            </NavLink>{" "}
            ·{" "}
            <NavLink to={`/play/${scenarioId}/result`} style={linkStyle}>
              Result
            </NavLink>
          </>
        )}{" "}
        ·{" "}
        {user ? (
          <>
            <span style={{ marginLeft: 8 }}>
              {`${user.nickname}${user.id ? `(${user.id})` : ""}님`}
            </span>
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
          <NavLink to="/login" style={linkStyle}>
            Login
          </NavLink>
        )}
      </header>

      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
