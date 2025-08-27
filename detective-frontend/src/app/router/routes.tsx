// src/app/routes.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import type { JSX } from "react";

import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import AdminLayout from "../layouts/AdminLayout";

// 실제 페이지
import LobbyPage from "../../pages/LobbyPage";
import LoginPage from "../../pages/LoginPage";
import SignupPage from "../../pages/SignupPage";
import ScenarioSelectPage from "../../pages/ScenarioSelectPage";
import GamePlayPage from "../../pages/GamePlayPage"; // ✅ 실페이지 유지
import MyPage from "../../pages/MyPage";
import CaseResultRoute from "../../pages/CaseResultRoute"; // ✅ 고정 결과 라우트
import ScenarioSummaryPage from "../../pages/ScenarioSummaryPage";
import CaseAnalysisPage from "../../pages/CaseAnalysisPage";

import AuthorNewScenarioPage from "../../pages/AuthorNewScenarioPage";
import AuthorMyScenariosPage from "../../pages/AuthorMyScenarioPage";
import AdminSubmittedListPage from "../../pages/AdminSubmittedListPage";
import AuthorScenarioDetailPage from "../../pages/AuthorScenarioDetailPage";
import AuthorEditScenarioPage from "../../pages/AuthorEditScenarioPage";
import RoleGate from "../../components/RoleGate";
import { useAuth } from "../../store/auth.store";
import AdminUsersPage from "../../pages/AdminUsersPage";
import AdminSubmittedDetailPage from "../../pages/AdminSubmittedDetailPage";
import AdminAllScenariosPage from "../../pages/AdminAllScenariosPage";
import AdminScenarioRegisterPage from "../../pages/AdminScenarioRegisterPage";

// 보호 라우트 (두 이름 모두 지원: RequireAuth / RequirAuth)
const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const user = useAuth((s) => s.user);
  return user ? children : <Navigate to="/login" replace />;
};
const RequirAuth = RequireAuth; // ✅ 기존 사용처 호환

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: "/", element: <LobbyPage /> },
      { path: "/scenarios", element: <ScenarioSelectPage /> }, // 메인 레이아웃에만 배치(중복 방지)
      { path: "/play/:scenarioId", element: <GamePlayPage /> },
      { path: "/play/:scenarioId/summary", element: <ScenarioSummaryPage /> },
      { path: "/result", element: <CaseResultRoute /> }, // ✅ 별도 고정 라우트 유지
      { path: "/analysis", element: <CaseAnalysisPage /> },

      // 내 정보(로그인 필요)
      { path: "/me", element: <MyPage /> },

      // 작가 전용
      {
        path: "/author/scenarios",
        element: (
          <RoleGate allow={["EXPERT", "ADMIN"]}>
            <AuthorMyScenariosPage />
          </RoleGate>
        ),
      },
      {
        path: "/author/scenarios/new",
        element: (
          <RoleGate allow={["EXPERT", "ADMIN"]}>
            <AuthorNewScenarioPage />
          </RoleGate>
        ),
      },
      {
        path: "/author/scenarios/:id",
        element: (
          <RoleGate allow={["EXPERT", "ADMIN"]}>
            <AuthorScenarioDetailPage />
          </RoleGate>
        ),
      },
      {
        path: "/author/scenarios/:id/edit",
        element: (
          <RoleGate allow={["EXPERT", "ADMIN"]}>
            <AuthorEditScenarioPage />
          </RoleGate>
        ),
      },
    ],
  },

  // 인증 레이아웃 (공개 페이지)
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
      // ⚠️ /scenarios는 MainLayout에만 존재하도록 정리(레이아웃 충돌 방지)
    ],
  },

  // 관리자 레이아웃
  {
    element: <AdminLayout />,
    children: [
      { path: "/admin", element: <div>Admin</div> }, // 기존 /admin 유지
      // ✅ 전체 시나리오 관리
      {
        path: "/admin/scenarios",
        element: (
          <RoleGate allow={["ADMIN"]}>
            <AdminAllScenariosPage />
          </RoleGate>
        ),
      },
      {
        path: "/admin/scenarios/submitted",
        element: (
          <RoleGate allow={["ADMIN"]}>
            <AdminSubmittedListPage />
          </RoleGate>
        ),
      },
      {
        path: "/admin/users",
        element: (
          <RoleGate allow={["ADMIN"]}>
            <AdminUsersPage />
          </RoleGate>
        ),
      },
      {
        path: "/admin/scenarios/submitted/:id",
        element: (
          <RoleGate allow={["ADMIN"]}>
            <AdminSubmittedDetailPage />
          </RoleGate>
        ),
      },
      {
        path: "/admin/scenarios/register",
        element: (
          <RoleGate allow={["ADMIN"]}>
            <AdminScenarioRegisterPage />
          </RoleGate>
        ),
      },
    ],
  },

  // 404 → 홈
  { path: "*", element: <Navigate to="/" replace /> },
]);
