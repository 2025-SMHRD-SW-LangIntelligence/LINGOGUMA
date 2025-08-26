import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../shared/api/client";
import { adaptScenarioSummary } from "../shared/adapters/scenario.adapter";
import { useScenario } from "../store/scenario.store";
import CaseResultPage from "./CaseResultPage";

function normalizeToObject(raw: unknown) {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw !== null && typeof raw === "object" ? raw : null;
}

// API & mock 동시 요청 → 먼저 성공하는 쪽 사용
async function getConfigFast(id: string) {
  const apiP = api
    .get(`/api/scenarios/${id}/result-config`, { timeout: 1500 })
    .then((res) => {
      const obj = normalizeToObject(res.data);
      if (!obj) throw new Error("API returned non-JSON");
      return obj;
    });

  const mockP = fetch(`/mock/${id}.json`, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error("mock not found");
    return r.json();
  });

  return Promise.any([apiP, mockP]);
}

export default function CaseResultRoute() {
  const currentId = useScenario((s) => s.currentScenarioId);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["scenario-result", currentId],
    enabled: !!currentId, // 시나리오가 정해졌을 때만 호출
    retry: 0,
    staleTime: 5 * 60 * 1000,
    queryFn: () => getConfigFast(currentId!),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: {
      culpritId: string;
      answers: Record<string, string>;
    }) => api.post(`/api/scenarios/${currentId}/result`, payload),
  });

  if (!currentId) {
    return (
      <div style={{ padding: 24, color: "#fff" }}>
        시나리오를 먼저 선택해주세요. (Scenarios에서 사건을 골라주세요)
      </div>
    );
  }

  if (isLoading)
    return <div style={{ padding: 24, color: "#fff" }}>불러오는 중…</div>;
  if (isError || !data) {
    console.error(error);
    return (
      <div style={{ padding: 24, color: "#fff" }}>
        데이터를 가져오지 못했어요.
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
        구성 데이터 형식이 올바르지 않습니다. (suspects / resultQuestions 확인)
      </div>
    );
  }
}
