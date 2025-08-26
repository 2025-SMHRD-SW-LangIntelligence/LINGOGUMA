// src/pages/AdminUsersPage.tsx
import { useEffect, useMemo, useState } from "react";
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

/** ✅ 100ms 디바운스 훅 */
function useDebouncedValue<T>(value: T, delay = 100) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function AdminUsersPage() {
  // 입력값과 실제 검색어를 분리해서 IME(한글) 입력 중엔 서버 호출을 막음
  const [inputValue, setInputValue] = useState("");
  const [q, setQ] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  // 100ms 디바운스된 검색어
  const dq = useDebouncedValue(q, 100);

  const qc = useQueryClient();

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["admin-users", dq],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<UserRow[]>("/admin/users", {
        params: dq ? { q: dq } : undefined, // ✅ 1글자도 허용
        signal, // ✅ 빠르게 타이핑 시 이전 요청 취소
      });
      return data;
    },
    // ✅ 이전 결과 유지해서 입력 중 깜빡임/점프 최소화 (RQ v5 방식)
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
    <div style={{ maxWidth: 960, margin: "24px auto" }}>
      <h2>유저 관리</h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <input
          placeholder="닉네임/이메일/로그인ID 검색"
          value={inputValue}
          onChange={(e) => {
            const v = e.target.value;
            setInputValue(v);
            if (!isComposing) setQ(v); // 조합 중이 아니면 즉시 반영(디바운스 적용됨)
          }}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={(e) => {
            setIsComposing(false);
            setQ((e.target as HTMLInputElement).value); // 조합 종료 시 반영
          }}
          style={{ padding: 8, flex: 1 }}
        />
        {isFetching && (
          <span style={{ fontSize: 12, color: "#888" }}>검색 중…</span>
        )}
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
