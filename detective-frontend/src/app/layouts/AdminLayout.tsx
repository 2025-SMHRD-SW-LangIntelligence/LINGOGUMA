import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/auth.store";
import { api } from "../../shared/api/client";
import "../../shared/styles/MyPage.css";

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const nav = useNavigate();

    const handleLogout = async () => {
        try {
            await api.post("/users/logout");
        } catch {}
        logout();
        nav("/login");
    };

    if (!user || user.role !== "ADMIN") {
        return (
            <div className="flex items-center justify-center h-screen text-red-600 text-lg">
                관리자 권한이 필요합니다.
            </div>
        );
    }

    return (
        <div className="mypage-container">
            {/* 좌측 사이드바 */}
            <aside
                className="mypage-sidebar"
                style={{ backgroundColor: "rgba(75, 106, 192, 0.3)" }}
            >
                <div className="profile">
                    <div className="avatar">👤</div>
                    <h2>{user?.userId ?? "관리자"}</h2>
                </div>

                <nav>
                    <ul>
                        <li>
                            <NavLink to="/admin/users" className="sidebar-link">
                                유저 관리
                            </NavLink>
                        </li>
                        <li>
                            <NavLink
                                to="/admin/scenarios"
                                className="sidebar-link"
                            >
                                시나리오 관리
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/admin/games" className="sidebar-link">
                                게임 관리
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/admin/logs" className="sidebar-link">
                                시스템 로그
                            </NavLink>
                        </li>
                        <li
                            onClick={handleLogout}
                            className="sidebar-link logout"
                        >
                            로그아웃
                        </li>
                    </ul>
                </nav>
            </aside>

            {/* 메인 컨텐츠 */}
            <main className="mypage-main">
                <Outlet />
            </main>
        </div>
    );
}
