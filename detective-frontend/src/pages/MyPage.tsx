import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth.store";
import { api } from "../shared/api/client";
import "./MyPage.css";

const MyPage: React.FC = () => {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      await api.post("/users/logout"); // 서버 세션 무효화
    } catch {}
    logout(); // 클라이언트 스토어 초기화
    nav("/login"); // 로그인 페이지로 이동
  };

  // (임시 예시 데이터) 실제로는 API에서 가져오기
  const data = [
    { subject: "논리적 추리", value: 80 },
    { subject: "관찰력", value: 65 },
    { subject: "시간 관리", value: 90 },
    { subject: "소통 능력", value: 70 },
    { subject: "기억력", value: 60 },
  ];

  return (
    <div className="mypage-container">
      {/* 좌측 사이드바 */}
      <aside className="mypage-sidebar">
        <div className="profile">
          <div className="avatar">👤</div>
          <h2>{user?.nickname || "게스트"}</h2>
        </div>
        <nav>
          <ul>
            <li>계정관리</li>
            <li>플레이 이력</li>
            <li
              onClick={handleLogout}
              style={{ cursor: "pointer", color: "#f39c12" }}
            >
              로그아웃
            </li>
          </ul>
        </nav>
      </aside>

      {/* 메인 컨텐츠 */}
      <main className="mypage-main">
        <h3>플레이 성향 분석</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart outerRadius="70%" data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" stroke="#fff" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#aaa" />
              <Radar
                name="내 성향"
                dataKey="value"
                stroke="#f39c12"
                fill="#f39c12"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
};

export default MyPage;
