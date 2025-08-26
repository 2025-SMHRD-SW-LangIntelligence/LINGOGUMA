import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../shared/api/client";
import { getApiErrorMessage } from "../shared/api/getApiErrorMessage";

export default function AuthorNewScenarioPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const nav = useNavigate();
  const qc = useQueryClient();

  const createScenario = useMutation({
    mutationFn: async (body: { title: string; content: string }) => {
      // author 절대 보내지 않음
      const { data } = await api.post("/scenarios", body);
      return data; // 서버의 ScenarioResponse
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-scenarios"] });
      nav("/author/scenarios");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력하세요.");
      return;
    }
    createScenario.mutate({ title, content });
  };

  const errorText = createScenario.isError
    ? getApiErrorMessage(createScenario.error)
    : "";

  return (
    <div style={{ maxWidth: 720, margin: "24px auto" }}>
      <h2>새 시나리오 초안</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ padding: 8, fontSize: 16 }}
        />
        <textarea
          placeholder="내용(JSON/텍스트 무엇이든)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          style={{ padding: 8, fontSize: 14, fontFamily: "monospace" }}
        />
        <button
          type="submit"
          disabled={createScenario.isPending}
          style={{ padding: "10px 14px" }}
        >
          {createScenario.isPending ? "제출 중..." : "초안 제출"}
        </button>

        {/* ✅ 문자열만 렌더 */}
        {createScenario.isError && (
          <p style={{ color: "crimson", whiteSpace: "pre-wrap" }}>
            {errorText}
          </p>
        )}
      </form>
    </div>
  );
}
