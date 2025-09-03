import { useState } from "react";
import { useAuth } from "@/store/auth.store";
import { api } from "@/shared/api/client";
import "@/shared/styles/MyPage.css";

export default function AccountInfoPage() {
    const { user, set, logout } = useAuth();
    const [nickname, setNickname] = useState(user?.nickname ?? "");
    const [password, setPassword] = useState("");

    const handleUpdateNickname = async () => {
        try {
            await api.post("/users/update-nickname", { nickname });
            alert("닉네임 변경 성공!");
            set({ user: { ...user, nickname } });
        } catch {
            alert("닉네임 변경 실패");
        }
    };

    const handleUpdatePassword = async () => {
        try {
            await api.post("/users/update-password", { password });
            alert("비밀번호 변경 성공!");
            setPassword("");
        } catch {
            alert("비밀번호 변경 실패");
        }
    };

    const handleLogout = () => {
        api.post("/users/logout").finally(() => {
            logout();
            window.location.href = "/login";
        });
    };

    return (
        <section>
            <h3 className="mypage-section-title">계정 정보</h3>

            <div className="profile-box">
                <div className="profile-info">
                    <p>
                        <strong>아이디:</strong> {user?.userId}
                    </p>
                    <p>
                        <strong>닉네임:</strong> {user?.nickname}
                    </p>
                    <p>
                        <strong>권한:</strong> {user?.role}
                    </p>
                </div>
            </div>

            {/* 닉네임 변경 */}
            <div className="field">
                <label htmlFor="nickname">닉네임 변경</label>
                <input
                    id="nickname"
                    type="text"
                    className="input"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleUpdateNickname}
                >
                    변경
                </button>
            </div>

            {/* 비밀번호 변경 */}
            <div className="field">
                <label htmlFor="password">비밀번호 변경</label>
                <input
                    id="password"
                    type="password"
                    className="input"
                    value={password}
                    placeholder="새 비밀번호 입력"
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button
                    className="btn btn-primary"
                    onClick={handleUpdatePassword}
                >
                    변경
                </button>
            </div>

            {/* 로그아웃 */}
            {/* <div className="field">
                <button className="btn btn-ghost" onClick={handleLogout}>
                    로그아웃
                </button>
            </div> */}
        </section>
    );
}
