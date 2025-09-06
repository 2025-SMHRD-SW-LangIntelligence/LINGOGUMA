// src/pages/mypage/RequestExpertPage.tsx
import { useAuth } from "@/store/auth.store";
import { api } from "@/shared/api/client";
import "@/shared/styles/MyPage.css";
import { useState } from "react";

export default function RequestExpertPage() {
  const { user, set } = useAuth();
  const [bio, setBio] = useState(""); // 자기소개 / 경력 입력
  const [loading, setLoading] = useState(false);

  const handleRequestExpert = async () => {
    try {
      setLoading(true);
      await api.post("/users/request-expert", { bio });
      alert("전문가 권한 신청 완료!");
      set({ user: { ...user, expertRequested: true } as any });
    } catch {
      alert("전문가 신청 실패");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <p className="form-error">로그인이 필요합니다.</p>;

  return (
    <section>
      <h3 className="mypage-section-title">전문가 권한 신청</h3>
      <p className="desc">
        전문가 권한을 신청하면 관리자의 승인이 필요합니다. 승인되면 시나리오
        작성 및 전문가 기능을 사용할 수 있습니다.
      </p>

      {user.expertRequested ? (
        <p className="info-msg">
          이미 신청 완료 상태입니다. 관리자의 승인을 기다려주세요.
        </p>
      ) : (
        <div className="profile-box">
          <div className="field">
            <label htmlFor="expert-bio">자기소개 / 경력</label>
            <textarea
              id="expert-bio"
              className="input"
              rows={4}
              placeholder="예: 추리소설 작가 3년 경력, 대학에서 심리학 전공..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <p></p>
          <button
            className="btn btn-primary"
            onClick={handleRequestExpert}
            disabled={loading || !bio.trim()}
          >
            {loading ? "신청 중..." : "전문가 권한 신청"}
          </button>
        </div>
      )}
    </section>
  );
}
