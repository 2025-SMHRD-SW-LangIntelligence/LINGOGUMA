// src/pages/AdminUsersPage.tsx
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../shared/api/client";

type UserRow = {
  index: number;
  id: string;
  email: string;
  nickname: string;
  role: "MEMBER" | "EXPERT" | "ADMIN";
  emailVerified: boolean;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      const { data } = await api.get<UserRow[]>("/admin/users", {
        params: q ? { q } : undefined,
      });
      return data;
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({
      index,
      role,
    }: {
      index: number;
      role: UserRow["role"];
    }) => {
      const { data } = await api.put<UserRow>(`/admin/users/${index}/role`, {
        role,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const delUser = useMutation({
    mutationFn: async (index: number) => {
      await api.delete(`/admin/users/${index}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const rows = useMemo(() => data ?? [], [data]);

  if (isLoading) return <p>불러오는 중…</p>;
  if (isError)
    return <p style={{ color: "crimson" }}>{(error as any)?.message}</p>;

  return (
    <div style={{ maxWidth: 960, margin: "24px auto" }}>
      <h2>유저 관리</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          placeholder="닉네임/이메일/로그인ID 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: 8, flex: 1 }}
        />
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#fafafa" }}>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "1px solid #eee",
              }}
            >
              #
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "1px solid #eee",
              }}
            >
              ID
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "1px solid #eee",
              }}
            >
              Email
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "1px solid #eee",
              }}
            >
              Nickname
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "1px solid #eee",
              }}
            >
              Role
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "1px solid #eee",
              }}
            >
              Verified
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "1px solid #eee",
              }}
            >
              Created
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "1px solid #eee",
              }}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.index}>
              <td style={{ padding: 8, borderBottom: "1px solid #f1f1f1" }}>
                {u.index}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #f1f1f1" }}>
                {u.id}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #f1f1f1" }}>
                {u.email}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #f1f1f1" }}>
                {u.nickname}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #f1f1f1" }}>
                <select
                  value={u.role}
                  onChange={(e) =>
                    changeRole.mutate({
                      index: u.index,
                      role: e.target.value as UserRow["role"],
                    })
                  }
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="EXPERT">EXPERT</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #f1f1f1" }}>
                {u.emailVerified ? "✅" : "❌"}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #f1f1f1" }}>
                {new Date(u.createdAt).toLocaleString()}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #f1f1f1" }}>
                <button
                  onClick={() => {
                    if (confirm("정말 삭제하시겠습니까?"))
                      delUser.mutate(u.index);
                  }}
                  disabled={delUser.isPending}
                  style={{
                    border: "1px solid #e33",
                    background: "white",
                    color: "#e33",
                    padding: "4px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  {delUser.isPending ? "삭제 중..." : "삭제"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
