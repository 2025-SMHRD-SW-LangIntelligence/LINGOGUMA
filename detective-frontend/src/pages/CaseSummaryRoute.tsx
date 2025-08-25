import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../shared/api/client";
import { adaptScenarioSummary } from "../shared/adapters/scenario.adapter";
import CaseSummaryPage from "./CaseSummaryPage";

function normalizeToObject(raw: unknown) {
  // 1) 문자열이면 JSON 파싱 시도
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed;
    } catch {
      // 문자열이지만 JSON이 아님(아마 HTML/에러문구)
      return null;
    }
  }
  // 2) 객체면 그대로
  if (raw !== null && typeof raw === "object") return raw;
  // 3) 그 외 타입은 무효
  return null;
}

export default function CaseSummaryRoute() {
  const { scenarioId } = useParams<{ scenarioId: string }>();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["scenario-summary", scenarioId],
    enabled: !!scenarioId,
    queryFn: async () => {
      // 1차: 백엔드에서 가져오기
      try {
        const res = await api.get(`/api/scenarios/${scenarioId}/summary-config`);
        const obj = normalizeToObject(res.data);
        if (obj) return obj;
        // 데이터가 문자열/HTML 등으로 왔다면 mock 폴백
        console.warn("API 응답이 JSON 객체가 아님 → mock으로 폴백");
      } catch (e) {
        console.warn("API 요청 실패 → mock으로 폴백", e);
      }
      // 2차: public/mock/<scenarioId>.json 폴백
      const r = await fetch(`/mock/${scenarioId}.json`);
      if (!r.ok) throw new Error("mock 파일을 찾을 수 없습니다.");
      return r.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: (payload: { culpritId: string; answers: Record<string, string> }) =>
      api.post(`/api/scenarios/${scenarioId}/summary`, payload),
  });

  if (isLoading) return <div style={{ padding: 24, color: "#fff" }}>불러오는 중…</div>;
  if (isError || !data) {
    console.error(error);
    return <div style={{ padding: 24, color: "#fff" }}>
      시나리오를 가져오지 못했어요. (네트워크/경로/권한 확인)
    </div>;
  }

  try {
    const { prompt, suspects, questions } = adaptScenarioSummary(data);
    console.log("scenario prompt:", prompt);
    return (
      <CaseSummaryPage
        suspects={suspects}
        questions={questions}
        onSubmit={(payload) => submitMutation.mutate(payload)}
      />
    );
  } catch (e) {
    console.error("Zod 검증 실패:", e);
    return <div style={{ padding: 24, color: "#fff" }}>
      구성 데이터 형식이 올바르지 않습니다. (suspectCount / suspects / resultQuestions 키와 값 타입을 확인하세요)
    </div>;
  }
}
