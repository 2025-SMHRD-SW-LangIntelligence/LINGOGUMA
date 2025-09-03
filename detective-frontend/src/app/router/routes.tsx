import { createBrowserRouter } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AuthLayout from "../layouts/AuthLayout";
import AdminLayout from "../layouts/AdminLayout";

import LobbyPage from "../../pages/LobbyPage";
import ScenarioSelectPage from "../../pages/game/ScenarioSelectPage";
import ScenarioSummaryPage from "../../pages/game/ScenarioSummaryPage";
import GamePlayPage from "../../pages/game/GamePlayPage";
import ResultPage from "../../pages/game/ResultPage";
import AnalysisPage from "../../pages/game/AnalysisPage";
import MyPageLayout from "../../pages/mypage/MyPageLayout";
import LoginPage from "../../pages/user/LoginPage";
import SignupPage from "../../pages/user/SignupPage";
import SignupCompletePage from "../../pages/user/SignupCompletePage";
import GameResultDetailPage from "../../pages/mypage/GameResultDetailPage";
import AccountInfoPage from "../../pages/mypage/AccountInfoPage";
import RequestExpertPage from "../../pages/mypage/RequestExpertPage";
import GameHistoryPage from "../../pages/mypage/GameHistoryPage";
import ExpertScenarioPage from "../../pages/mypage/ExpertScenarioPage";

import AdminDashboardPage from "../../pages/admin/AdminDashboardPage";
// 관리자 하위 페이지
import AdminUserPage from "../../pages/admin/users/AdminUserPage";
import AdminScenarioPage from "../../pages/admin/scenarios/AdminScenarioPage";
import AdminGamePage from "../../pages/admin/games/AdminGamePage";
import AdminLogPage from "../../pages/admin/logs/AdminLogPage";

export const router = createBrowserRouter([
    {
        element: <MainLayout />,
        children: [
            { path: "/", element: <LobbyPage /> },
            { path: "/scenarios", element: <ScenarioSelectPage /> },
            {
                path: "/scenarios/:scenarioId/summary",
                element: <ScenarioSummaryPage />,
            },
            { path: "/play/:scenarioId", element: <GamePlayPage /> },
            { path: "/play/:scenarioId/result", element: <ResultPage /> },
            { path: "/play/:scenarioId/analysis", element: <AnalysisPage /> },
            {
                path: "/my",
                element: <MyPageLayout />,
                children: [
                    { path: "account", element: <AccountInfoPage /> },
                    { path: "request-expert", element: <RequestExpertPage /> },
                    { path: "history", element: <GameHistoryPage /> },
                    {
                        path: "game-result/:resultId",
                        element: <GameResultDetailPage />,
                    },
                    {
                        path: "expert-scenario",
                        element: <ExpertScenarioPage />,
                    },
                ],
            },
        ],
    },
    {
        element: <AuthLayout />,
        children: [
            { path: "/login", element: <LoginPage /> },
            { path: "/signup", element: <SignupPage /> },
            { path: "/signup/complete", element: <SignupCompletePage /> },
        ],
    },
    {
        path: "/admin",
        element: <AdminLayout />,
        children: [
            { path: "", element: <AdminDashboardPage /> }, // 기본 대시보드
            { path: "users", element: <AdminUserPage /> },
            { path: "scenarios", element: <AdminScenarioPage /> },
            { path: "games", element: <AdminGamePage /> },
            { path: "logs", element: <AdminLogPage /> },
        ],
    },
]);
