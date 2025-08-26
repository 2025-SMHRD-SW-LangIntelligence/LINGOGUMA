import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { api } from "../shared/api/client";
import { useAuth } from "../store/auth.store";

type Role = "MEMBER" | "EXPERT" | "ADMIN";
type Me = { nickname: string; id: string; index?: number; role?: Role };

export default function RoleGate({
  allow,
  children,
}: {
  allow: Role[];
  children: ReactNode;
}) {
  const { user, set } = useAuth();
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState("");

  useEffect(() => {
    if (!user || typeof user !== "object" || !(user as any).role) {
      api
        .get<Me>("/users/me")
        .then(({ data }) => {
          if (data?.nickname) set({ user: data });
        })
        .catch(() => setDenied("로그인이 필요합니다."))
        .finally(() => setReady(true));
      return;
    }
    setReady(true);
  }, [user, set]);

  if (!ready) return <div>로딩 중...</div>;

  const role = (user as any)?.role as Role | undefined;
  if (!role)
    return (
      <div style={{ color: "crimson" }}>
        {denied || "접근 권한이 없습니다."}
      </div>
    );
  if (!allow.includes(role)) {
    return (
      <div style={{ color: "crimson" }}>
        이 페이지 접근 권한이 없습니다. (필요: {allow.join(", ")})
      </div>
    );
  }
  return <>{children}</>;
}
