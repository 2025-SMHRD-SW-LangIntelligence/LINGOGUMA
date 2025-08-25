import { createBrowserRouter, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import AdminLayout from "../layouts/AdminLayout";

// 실제 페이지 import
import LobbyPage from "../../pages/LobbyPage";
import LoginPage from "../../pages/LoginPage";
import SignupPage from "../../pages/SignupPage";
import ScenarioSelectPage from "../../pages/ScenarioSelectPage";
// import GamePlayPage from "../../pages/GamePlayPage";   // 있으면 import
// import MyPage from "../../pages/MyPage";
// import AdminDashboardPage from "../../pages/AdminDashboardPage";
import CaseResultRoute from "../../pages/CaseResultRoute";

const GamePlayPage = () => <div>Game Play</div>;
const MyPage = () => <div>My Page</div>;
const AdminDashboardPage = () => <div>Admin</div>;

import { useAuth } from "../../store/auth.store";
import type { JSX } from "react";

// 보호 라우트
const RequirAuth = ({ children }: { children: JSX.Element }) => {
  const user = useAuth((s) => s.user);
  return user ? children : <Navigate to="/login" replace />;
};

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: "/", element: <LobbyPage /> },
      { path: "/scenarios", element: <ScenarioSelectPage /> },
      { path: "/play/:scenarioId", element: <GamePlayPage /> },
      { path: "/play/:scenarioId/result", element: <CaseResultRoute /> },

      {
        path: "/me",
        element: (
          <RequirAuth>
            <MyPage />
          </RequirAuth>
        ),
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
      { path: "/scenarios", element: <ScenarioSelectPage /> },
    ],
  },
  {
    element: <AdminLayout />,
    children: [{ path: "/admin", element: <AdminDashboardPage /> }],
  },
]);
