import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../shared/api/client";
import { adaptScenarioSummary } from "../shared/adapters/scenario.adapter";
import CaseResultPage from "./CaseResultPage";

function normalizeToObject(raw: unknown) {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (raw !== null && typeof raw === "object") return raw;
  return null;
}

/** ⚡ API와 mock을 동시에 요청해서, 먼저 성공하는 데이터를 사용 */
async function getScenarioConfigFast(scenarioId: string) {
  const apiP = api
    .get(`/api/scenarios/${scenarioId}/result-config`, { timeout: 1500 })
    .then((res) => {
      const obj = normalizeToObject(res.data);
      if (!obj) throw new Error("API returned non-JSON");
      return obj;
    });

  const mockP = fetch(`/mock/${scenarioId}.json`, { cache: "no-store" }).then(
    (r) => {
      if (!r.ok) throw new Error("mock not found");
      return r.json();
    }
  );

  // 먼저 성공하는 쪽을 채택 (둘 다 실패하면 reject)
  return Promise.any([apiP, mockP]);
}

export default function CaseResultRoute() {
  const { scenarioId } = useParams<{ scenarioId: string }>();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["scenario-result", scenarioId],
    enabled: !!scenarioId,
    retry: 0, // ✅ 재시도 끄기(불필요한 대기 제거)
    staleTime: 5 * 60 * 1000, // ✅ 5분 캐시(재방문/F5 즉시 렌더)
    queryFn: () => getScenarioConfigFast(String(scenarioId)),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: {
      culpritId: string;
      answers: Record<string, string>;
    }) => api.post(`/api/scenarios/${scenarioId}/result`, payload),
  });

  if (isLoading) {
    return <div style={{ padding: 24, color: "#fff" }}>불러오는 중…</div>;
  }
  if (isError || !data) {
    console.error(error);
    return (
      <div style={{ padding: 24, color: "#fff" }}>
        시나리오를 가져오지 못했어요. (네트워크/경로/권한 확인)
      </div>
    );
  }

  try {
    const { prompt, suspects, questions } = adaptScenarioSummary(data);
    return (
      <CaseResultPage
        suspects={suspects}
        questions={questions}
        onSubmit={(payload) => submitMutation.mutate(payload)}
      />
    );
  } catch (e) {
    console.error("Zod 검증 실패:", e);
    return (
      <div style={{ padding: 24, color: "#fff" }}>
        구성 데이터 형식이 올바르지 않습니다. (suspectCount / suspects /
        resultQuestions 확인)
      </div>
    );
  }
}
