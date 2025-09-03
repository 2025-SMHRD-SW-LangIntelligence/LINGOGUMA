import { useEffect, useState } from "react";
import { api } from "../../../shared/api/client";

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
            setUsers(data);
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

    return (
        <div>
            <h2>유저 관리</h2>
            {loading && <p>로딩 중...</p>}
            <table border={1} cellPadding={8}>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>닉네임</th>
                        <th>권한</th>
                        <th>전문가 신청 여부</th>
                        <th>액션</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <tr key={u.userIdx}>
                            <td>{u.userId}</td>
                            <td>{u.nickname}</td>
                            <td>{u.role}</td>
                            <td>{u.expertRequested ? "신청함" : "-"}</td>
                            <td>
                                {u.expertRequested && u.role === "MEMBER" && (
                                    <button
                                        onClick={() =>
                                            handleApproveExpert(u.userIdx)
                                        }
                                    >
                                        전문가 승인
                                    </button>
                                )}
                                <button
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
    );
}
