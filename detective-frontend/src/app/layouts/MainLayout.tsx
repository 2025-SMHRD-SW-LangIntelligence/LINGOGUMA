// src/app/layouts/MainLayout.tsx
import { Outlet } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useAuth } from "../../store/auth.store";
import { api } from "../../shared/api/client";

export default function MainLayout() {
  const { user, set } = useAuth();
  const hydrated = useRef(false);

  // 새로고침 시 세션 하이드레이트: 세션 쿠키(JSESSIONID)가 있으면 /me가 200을 반환
  useEffect(() => {
    if (hydrated.current) return;
    if (!user) {
      api
        .get("/users/me")
        .then(({ data }) => {
          if (data?.nickname) set({ user: data });
        })
        .catch(() => {
          // 미로그인(401) 등은 무시
        })
        .finally(() => {
          hydrated.current = true;
        });
    } else {
      hydrated.current = true;
    }
  }, [user, set]);

  return (
    <div>
      {/* NavBar 전체 제거 */}
      <main style={{ padding: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}
