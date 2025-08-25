// src/app/layouts/MainLayout.tsx
import { Outlet, NavLink, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../store/auth.store";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { scenarioId } = useParams(); // URL에 :scenarioId가 있을 때만 값 존재

  const handleLogout = () => {
    logout();
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
        <NavLink to="/" style={linkStyle}>Lobby</NavLink> ·
        <NavLink to="/scenarios" style={linkStyle}>Scenarios</NavLink> ·
        <NavLink to="/me" style={linkStyle}>My</NavLink>
        {/* 현재 경로에 :scenarioId가 있을 때만 Summary 메뉴 노출 */}
        {scenarioId && (
          <>
            {" "}·{" "}
            <NavLink
              to={`/play/${scenarioId}/summary`}
              style={linkStyle}
            >
              Summary
            </NavLink>
          </>
        )}
        {" "}·{" "}
        {user ? (
          <>
            <span style={{ marginLeft: 8 }}>{user?.nickname ?? "User"}님</span>
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
          <NavLink to="/login" style={linkStyle}>Login</NavLink>
        )}
      </header>

      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
