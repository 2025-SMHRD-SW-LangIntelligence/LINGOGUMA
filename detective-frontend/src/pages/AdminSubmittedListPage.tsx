import { useEffect, useState } from "react";
import { api } from "../shared/api/client";
import RoleGate from "../components/RoleGate";
import type { Scenario } from "../shared/types/scenario";

export default function AdminSubmittedListPage() {
  const [list, setList] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = () => {
    setLoading(true);
    setMsg("");
    setErr("");
    api
      .get<Scenario[]>("/admin/scenarios/submitted")
      .then(({ data }) => setList(data || []))
      .catch((e) => {
        const m =
          e?.response?.data?.message ??
          e?.response?.data ??
          e?.message ??
          "조회 실패";
        setErr(typeof m === "string" ? m : "조회 실패");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const approve = (id: number) => {
    setMsg("");
    setErr("");
    api
      .post(`/admin/scenarios/${id}/approve`)
      .then(() => {
        setMsg("승인 완료");
        load();
      })
      .catch((e) => {
        const m =
          e?.response?.data?.message ??
          e?.response?.data ??
          e?.message ??
          "승인 실패";
        setErr(typeof m === "string" ? m : "승인 실패");
      });
  };

  const reject = (id: number) => {
    const reason = window.prompt("반려 사유를 입력하세요.") || "";
    setMsg("");
    setErr("");
    api
      .post(`/admin/scenarios/${id}/reject`, { reason })
      .then(() => {
        setMsg("반려 처리 완료");
        load();
      })
      .catch((e) => {
        const m =
          e?.response?.data?.message ??
          e?.response?.data ??
          e?.message ??
          "반려 실패";
        setErr(typeof m === "string" ? m : "반려 실패");
      });
  };

  return (
    <RoleGate allow={["ADMIN"]}>
      <div style={{ display: "grid", gap: 8 }}>
        <h2>제출된 시나리오 (관리자)</h2>
        {loading && <div>로딩 중...</div>}
        {msg && <div style={{ color: "green" }}>{msg}</div>}
        {err && <div style={{ color: "crimson" }}>{err}</div>}
        <table style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ddd", padding: 6 }}>ID</th>
              <th style={{ borderBottom: "1px solid #ddd", padding: 6 }}>
                제목
              </th>
              <th style={{ borderBottom: "1px solid #ddd", padding: 6 }}>
                작성자
              </th>
              <th style={{ borderBottom: "1px solid #ddd", padding: 6 }}>
                제출시각
              </th>
              <th style={{ borderBottom: "1px solid #ddd", padding: 6 }}>
                동작
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td style={{ padding: 6 }}>{s.id}</td>
                <td style={{ padding: 6 }}>{s.title}</td>
                <td style={{ padding: 6 }}>{s.author?.nickname ?? "-"}</td>
                <td style={{ padding: 6 }}>{s.submittedAt ?? "-"}</td>
                <td style={{ padding: 6, display: "flex", gap: 6 }}>
                  <button onClick={() => approve(s.id)}>승인</button>
                  <button onClick={() => reject(s.id)}>반려</button>
                </td>
              </tr>
            ))}
            {!list.length && !loading && (
              <tr>
                <td colSpan={5} style={{ padding: 6, color: "#777" }}>
                  데이터 없음
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </RoleGate>
  );
}
