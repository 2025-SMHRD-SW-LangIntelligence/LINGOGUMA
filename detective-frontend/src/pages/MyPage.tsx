import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import "./MyPage.css";

const MyPage: React.FC = () => {
  // TODO: 실제 API에서 불러오기
  const user = { nickname: "세인업데", email: "test@example.com" };

  // 사용자의 플레이 결과 평균 (예시)
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
          <h2>{user.nickname}</h2>
        </div>
        <nav>
          <ul>
            <li>계정관리</li>
            <li>플레이 이력</li>
            <li>로그아웃</li>
          </ul>
        </nav>
      </aside>

      {/* 메인 컨텐츠 */}
      <main className="mypage-main">
        <h3>플레이 성향 분석</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart outerRadius="80%" data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="내 성향"
                dataKey="value"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
};

export default MyPage;
