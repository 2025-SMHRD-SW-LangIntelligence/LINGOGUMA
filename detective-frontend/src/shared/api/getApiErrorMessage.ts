import type { AxiosError } from "axios";

export function getApiErrorMessage(err: unknown): string {
  const e = err as AxiosError<any>;
  const data = e?.response?.data;

  // 서버가 문자열을 보내는 경우
  if (typeof data === "string") return data;

  // 서버가 표준 에러 JSON을 보내는 경우 (Spring Boot)
  if (data && typeof data === "object") {
    return (
      (data.message as string) || (data.error as string) || JSON.stringify(data)
    );
  }

  // Axios 자체 메시지 or 기타
  return e?.message || "알 수 없는 오류가 발생했습니다.";
}
