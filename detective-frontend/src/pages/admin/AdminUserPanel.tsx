// src/features/admin/AdminUserPanel.tsx
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import "./admin-panel.css";

type UserRow = {
  index: number;
  id: string;
  email: string;
  nickname: string;
  role: "MEMBER" | "EXPERT" | "ADMIN";
  emailVerified: boolean;
  createdAt: string;
};

function useDebouncedValue<T>(value: T, delay = 100) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function AdminUserPanel() {
  const [inputValue, setInputValue] = useState("");
  const [q, setQ] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const dq = useDebouncedValue(q, 100);

  const qc = useQueryClient();

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["admin-users", dq],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<UserRow[]>("/admin/users", {
        params: dq ? { q: dq } : undefined,
        signal,
      });
      return data;
    },
    placeholderData: (prev) => prev,
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
    <div className="admin-panel" style={{ maxWidth: 960, margin: "24px auto" }}>
      <h2>유저 관리</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          placeholder="닉네임/이메일/로그인ID 검색"
          value={inputValue}
          onChange={(e) => {
            const v = e.target.value;
            setInputValue(v);
            if (!isComposing) setQ(v);
          }}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={(e) => {
            setIsComposing(false);
            setQ((e.target as HTMLInputElement).value);
          }}
          style={{
            padding: 8,
            flex: 1,
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
        {isFetching && (
          <span style={{ fontSize: 12, color: "#888" }}>검색 중…</span>
        )}
      </div>

      <table className="light-table">
        <thead>
          <tr>
            <th>#</th>
            <th>ID</th>
            <th>Email</th>
            <th>Nickname</th>
            <th>Role</th>
            <th>Verified</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.index}>
              <td>{u.index}</td>
              <td>{u.id}</td>
              <td>{u.email}</td>
              <td>{u.nickname}</td>
              <td>
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
              <td>{u.emailVerified ? "✅" : "❌"}</td>
              <td>{new Date(u.createdAt).toLocaleString()}</td>
              <td>
                <button
                  onClick={() => {
                    if (confirm("정말 삭제하시겠습니까?"))
                      delUser.mutate(u.index);
                  }}
                  disabled={delUser.isPending}
                  className="btn-danger"
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
