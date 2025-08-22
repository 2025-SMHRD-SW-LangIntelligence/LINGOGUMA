import axios, { AxiosError } from "axios";
import { useAuth } from "../../store/auth.store";

// .env: VITE_API_BASE=/api  (프록시 쓰면 /api 권장)
// 또는 VITE_API_BASE=http://localhost:8099/api (직접 호출)
const baseURL = import.meta.env.VITE_API_BASE ?? "/api";

export const api = axios.create({
  baseURL,
  withCredentials: true, // ✅ 세션 쿠키 전송 필수
  timeout: 15000,
});

// 요청 인터셉터: 토큰 있으면 함께 전송(세션+토큰 혼용 대비)
api.interceptors.request.use((cfg) => {
  const t = useAuth.getState().token;
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// 응답 인터셉터: 401이면 스토어 정리
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<any>) => {
    if (err.response?.status === 401) {
      const state: any = useAuth.getState();
      if (state?.logout) state.logout(); // 또는 state.clear()
    }
    return Promise.reject(err);
  }
);

export default api;
