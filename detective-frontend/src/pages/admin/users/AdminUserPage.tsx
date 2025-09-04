import { useEffect, useState } from "react";
import { api } from "../../../shared/api/client";
import "@/shared/styles/MyPage.css";
import "@/shared/styles/AdminPage.css";

interface User {
  userIdx: number;
  userId: string;
  nickname: string;
  role: "MEMBER" | "EXPERT" | "ADMIN";
  expertRequested?: boolean;
}

export default function AdminUserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<User[]>("/admin/users");
      setUsers(data ?? []);
    } catch (e) {
      console.error("유저 목록 불러오기 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApproveExpert = async (userId: number) => {
    try {
      await api.post(`/users/approve-expert/${userId}`);
      alert("전문가 권한 승인 완료");
      setUsers((prev) =>
        prev.map((u) =>
          u.userIdx === userId
            ? { ...u, role: "EXPERT", expertRequested: false }
            : u
        )
      );
    } catch {
      alert("승인 실패");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.userIdx !== userId));
    } catch {
      alert("삭제 실패");
    }
  };

  const empty = !loading && users.length === 0;

  return (
    <section className="account-section">
      <h3 className="mypage-section-title">유저 관리</h3>

      <div className="account-card">
        <div className="account-card-body">
          {loading && <p className="admin-loading">불러오는 중…</p>}
          {empty && <p className="account-empty">사용자가 없습니다.</p>}

          {!empty && (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>닉네임</th>
                    <th>권한</th>
                    <th>전문가 신청</th>
                    <th className="col-actions">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.userIdx}>
                      <td className="mono">{u.userId}</td>
                      <td>{u.nickname}</td>
                      <td>
                        <span
                          className={`role-badge role-${u.role.toLowerCase()}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.expertRequested ? (
                          <span className="badge badge-pending">신청함</span>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
                      <td className="actions">
                        {u.expertRequested && u.role === "MEMBER" && (
                          <button
                            className="account-btn account-btn-primary account-btn-sm"
                            onClick={() => handleApproveExpert(u.userIdx)}
                          >
                            전문가 승인
                          </button>
                        )}
                        <button
                          className="account-btn account-btn-danger account-btn-sm"
                          onClick={() => handleDeleteUser(u.userIdx)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
