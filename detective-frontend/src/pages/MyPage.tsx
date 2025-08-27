// src/pages/MyPage.tsx
import React, { useState, useEffect } from "react";
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

  const role = user?.role ?? "";
  const isAdmin = role === "ADMIN" || role === "ROLE_ADMIN";
  const isExpert = role === "EXPERT" || role === "ROLE_EXPERT";
  const isAuthor = isExpert || isAdmin;

  // ✅ 탭 상태
  const [activeTab, setActiveTab] = useState<
    "account" | "history" | "analysis"
  >("analysis");

  // ✅ 닉네임 상태
  const [nickname, setNickname] = useState(user?.nickname || "");

  // ✅ 프로필 이미지 상태
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // 로컬스토리지에서 프로필 이미지 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("profileImage");
    if (saved) setProfileImage(saved);
  }, []);

  // 로그아웃
  const handleLogout = async () => {
    try {
      await api.post("/users/logout");
    } catch {}
    logout();
    nav("/login");
  };

  // 닉네임 저장
  const handleSaveNickname = async () => {
    try {
      await api.put("/api/users/me", { nickname });
      alert("닉네임이 변경되었습니다!");
    } catch {
      alert("닉네임 변경 실패");
    }
  };

  // 프로필 이미지 변경
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setProfileImage(base64);
      localStorage.setItem("profileImage", base64);
    };
    reader.readAsDataURL(file);
  };

  // (임시 예시 데이터)
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
          <div className="avatar">
            {profileImage ? (
              <img src={profileImage} alt="프로필" className="avatar-img" />
            ) : (
              "👤"
            )}
          </div>
          <h2>{nickname || "게스트"}</h2>
        </div>
        <nav>
          <ul>
            <li
              style={{
                marginTop: 8,
                fontSize: 20,
                color: "#fff",
                cursor: "default",
              }}
            >
              내 정보
            </li>
            <li
              onClick={() => setActiveTab("account")}
              style={{
                cursor: "pointer",
                color: activeTab === "account" ? "#e77a3e" : "#fff",
              }}
            >
              프로필 관리
            </li>
            <li
              onClick={() => setActiveTab("history")}
              style={{
                cursor: "pointer",
                color: activeTab === "history" ? "#e77a3e" : "#fff",
              }}
            >
              플레이 이력
            </li>
            <li
              onClick={() => setActiveTab("analysis")}
              style={{
                cursor: "pointer",
                color: activeTab === "analysis" ? "#e77a3e" : "#fff",
              }}
            >
              성향 분석
            </li>

            {/* 작가 메뉴 */}
            {isAuthor && (
              <>
                <li
                  style={{
                    marginTop: 8,
                    fontSize: 20,
                    color: "#fff",
                    cursor: "default",
                  }}
                >
                  작가
                </li>
                <li
                  onClick={() => nav("/author/scenarios")}
                  style={{ cursor: "pointer", color: "#fff" }}
                >
                  내 시나리오
                </li>
                <li
                  onClick={() => nav("/author/scenarios/new")}
                  style={{ cursor: "pointer", color: "#fff" }}
                >
                  새 초안 작성
                </li>
              </>
            )}

            {/* 관리자 메뉴 */}
            {isAdmin && (
              <>
                <li
                  style={{
                    marginTop: 8,
                    fontSize: 20,
                    color: "#fff",
                    cursor: "default",
                  }}
                >
                  관리자
                </li>
                <li
                  onClick={() => nav("/admin/users")}
                  style={{ cursor: "pointer", color: "#fff" }}
                >
                  유저 관리
                </li>
                <li
                  onClick={() => nav("/admin/scenarios")}
                  style={{ cursor: "pointer", color: "#fff" }}
                >
                  시나리오 관리
                </li>
                <li
                  onClick={() => nav("/admin/scenarios/submitted")}
                  style={{ cursor: "pointer", color: "#fff" }}
                >
                  제출된 시나리오
                </li>
                <li
                  onClick={() => nav("/admin/scenarios/register")}
                  style={{ cursor: "pointer", color: "#fff" }}
                >
                  시나리오 등록 관리
                </li>
              </>
            )}

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
        {activeTab === "account" && (
          <section>
            <h3>프로필 관리</h3>
            <div className="profile-box">
              <div className="profile-avatar">
                <div className="avatar-preview">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="프리뷰"
                      className="avatar-img"
                    />
                  ) : (
                    "👤"
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
              <div className="profile-info">
                <p>{/* <strong>이메일:</strong> {user?.email} */}</p>
                <label>
                  닉네임:
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </label>
                <button onClick={handleSaveNickname}>저장</button>
              </div>
            </div>
          </section>
        )}

        {activeTab === "history" && (
          <section>
            <h3>플레이 이력</h3>
            <p>최근 플레이 기록이 여기에 표시됩니다.</p>
          </section>
        )}

        {activeTab === "analysis" && (
          <section>
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
          </section>
        )}
      </main>

      {/* ✅ PLAY 버튼 */}
      <button className="play-fab" onClick={() => nav("/scenarios")}>
        ▶ PLAY
      </button>
    </div>
  );
};

export default MyPage;
