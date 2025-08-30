//
// src/pages/author/AuthorEditScenarioPanel.tsx
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";

type ScenarioDetail = {
  id: number;
  title: string;
  content: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
};

interface Props {
  scenarioId: number;
  onCancel: () => void;
  onSaved: (id: number) => void;
}

export default function AuthorEditScenarioPanel({
  scenarioId,
  onCancel,
  onSaved,
}: Props) {
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["scenario", scenarioId],
    queryFn: async () => {
      const { data } = await api.get<ScenarioDetail>(
        `/scenarios/${scenarioId}`
      );
      return data;
    },
    enabled: !!scenarioId,
  });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (data) {
      setTitle(data.title);
      setContent(data.content);
    }
  }, [data]);

  const update = useMutation({
    mutationFn: async (body: { title: string; content: string }) => {
      const { data } = await api.put(`/scenarios/${scenarioId}`, body);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scenario", scenarioId] });
      qc.invalidateQueries({ queryKey: ["my-scenarios"] });
      onSaved(scenarioId);
    },
  });

  if (isLoading) return <p>불러오는 중…</p>;
  if (isError)
    return <p style={{ color: "crimson" }}>{(error as any)?.message}</p>;
  if (!data) return null;

  const editable = data.status === "REJECTED" || data.status === "SUBMITTED";

  return (
    <div style={{ maxWidth: 720, margin: "24px auto" }}>
      <h2>시나리오 수정</h2>
      {!editable && (
        <p style={{ color: "#b36b00", marginTop: 0 }}>
          현재 상태({data.status})에서는 수정이 제한됩니다. (REJECTED 또는
          SUBMITTED 상태에서만 수정/삭제 가능)
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({ title, content });
        }}
        style={{ display: "grid", gap: 12 }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          style={{ padding: 8, fontSize: 16 }}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용"
          rows={12}
          style={{ padding: 8, fontSize: 14, fontFamily: "monospace" }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
            disabled={update.isPending || !editable}
            style={{ padding: "8px 12px" }}
          >
            {update.isPending ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "8px 12px",
              background: "#eee",
              border: "1px solid #ccc",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            취소
          </button>
        </div>
        {update.isError && (
          <p style={{ color: "crimson" }}>
            {(update.error as any)?.response?.data ||
              "수정 중 오류가 발생했습니다."}
          </p>
        )}
      </form>
    </div>
  );
}
