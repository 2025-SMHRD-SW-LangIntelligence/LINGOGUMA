// src/pages/mypage/MyPageLayout.tsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/store/auth.store";
import { api } from "@/shared/api/client";
import "@/shared/styles/MyPage.css";

export default function MyPageLayout() {
    const { user, logout } = useAuth();
    const nav = useNavigate();

    // 권한 체크
    const isMember = user?.role === "MEMBER";
    const isExpert = user?.role === "EXPERT";
    const isAdmin = user?.role === "ADMIN";

    const handleLogout = async () => {
        try {
            await api.post("/users/logout");
        } catch {}
        logout();
        nav("/login");
    };

    return (
        <div className="mypage-container">
            {/* 좌측 사이드바 */}
            <aside className="mypage-sidebar">
                <div className="profile">
                    <div className="avatar">👤</div>
                    <h2>{user?.nickname ?? "게스트"}</h2>
                </div>

                <nav>
                    <ul>
                        {/* 공통 메뉴 */}
                        <li>
                            <NavLink to="/my/account" className="sidebar-link">
                                계정 정보
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/my/history" className="sidebar-link">
                                게임 기록
                            </NavLink>
                        </li>

                        {/* MEMBER 전용 */}
                        {isMember && (
                            <li>
                                <NavLink
                                    to="/my/request-expert"
                                    className="sidebar-link"
                                >
                                    전문가 권한 신청
                                </NavLink>
                            </li>
                        )}

                        {/* EXPERT, ADMIN 공통 */}
                        {(isExpert || isAdmin) && (
                            <li>
                                <NavLink
                                    to="/my/expert-scenario"
                                    className="sidebar-link"
                                >
                                    시나리오 작성
                                </NavLink>
                            </li>
                        )}

                        {/* ADMIN 전용 */}
                        {isAdmin && (
                            <li>
                                <NavLink to="/admin" className="sidebar-link">
                                    관리자 페이지
                                </NavLink>
                            </li>
                        )}

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

            {/* Play 버튼 */}
            <button className="play-fab" onClick={() => nav("/scenarios")}>
                ▶ PLAY
            </button>
        </div>
    );
}
