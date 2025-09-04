import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";
/* 공통 톤 */
import "@/shared/styles/MyPage.css";
/* 관리자 전용 */
import "@/shared/styles/AdminPage.css";

interface Scenario {
  scenIdx: number;
  scenTitle: string;
  scenSummary: string;
  scenLevel: number;
  scenAccess: "FREE" | "MEMBER";
  scenStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export default function AdminScenarioPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);

  // 상태 필터
  const [filter, setFilter] = useState<
    "ALL" | "DRAFT" | "PUBLISHED" | "ARCHIVED"
  >("ALL");

  // ------------------------------
  // 데이터 가져오기
  // ------------------------------
  const fetchScenarios = async (status: string) => {
    try {
      setLoading(true);
      const url =
        status && status !== "ALL"
          ? `/admin/scenarios/status/${status}`
          : `/admin/scenarios`;
      const { data } = await api.get<Scenario[]>(url);
      setScenarios(data ?? []);
    } catch (e) {
      console.error("시나리오 목록 불러오기 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios(filter);
  }, [filter]);

  // ------------------------------
  // 액션
  // ------------------------------
  const handleApprove = async (id: number) => {
    try {
      await api.post(`/admin/scenarios/${id}/approve`);
      alert("시나리오 승인 완료");
      setScenarios((prev) =>
        prev.map((s) =>
          s.scenIdx === id ? { ...s, scenStatus: "PUBLISHED" } : s
        )
      );
    } catch {
      alert("승인 실패");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.post(`/admin/scenarios/${id}/reject`);
      alert("시나리오 반려 완료");
      setScenarios((prev) =>
        prev.map((s) =>
          s.scenIdx === id ? { ...s, scenStatus: "ARCHIVED" } : s
        )
      );
    } catch {
      alert("반려 실패");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await api.delete(`/admin/scenarios/${id}`);
      setScenarios((prev) => prev.filter((s) => s.scenIdx !== id));
    } catch {
      alert("삭제 실패");
    }
  };

  const empty = !loading && scenarios.length === 0;

  // ------------------------------
  // 렌더링
  // ------------------------------
  return (
    <section className="account-section admin-section--wide">
      <h3 className="mypage-section-title">시나리오 관리</h3>

      <div className="account-card">
        <div className="account-card-body">
          {/* 상태 필터 */}
          <div className="admin-toolbar">
            <div className="toolbar-group">
              <label className="toolbar-label">상태</label>
              <select
                className="admin-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
              >
                <option value="ALL">전체</option>
                <option value="DRAFT">DRAFT (대기)</option>
                <option value="PUBLISHED">PUBLISHED (승인됨)</option>
                <option value="ARCHIVED">ARCHIVED (반려됨)</option>
              </select>
            </div>
          </div>

          {loading && <p className="admin-loading">시나리오 로딩 중…</p>}
          {empty && <p className="account-empty">시나리오가 없습니다.</p>}

          {!empty && (
            <div className="table-wrap">
              <table className="admin-table scenario-table">
                <thead>
                  <tr>
                    <th style={{ width: 84 }}>ID</th>
                    <th style={{ width: 220 }}>제목</th>
                    <th>요약</th>
                    <th style={{ width: 120 }}>상태</th>
                    <th className="col-actions">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s) => (
                    <tr key={s.scenIdx}>
                      <td className="mono">{s.scenIdx}</td>
                      <td className="td-title" title={s.scenTitle}>
                        {s.scenTitle}
                      </td>
                      <td className="td-summary" title={s.scenSummary}>
                        {s.scenSummary}
                      </td>
                      <td>
                        <span
                          className={`status-badge status-${s.scenStatus.toLowerCase()}`}
                        >
                          {s.scenStatus}
                        </span>
                      </td>
                      <td className="actions">
                        {s.scenStatus === "DRAFT" && (
                          <>
                            <button
                              className="account-btn account-btn-primary account-btn-sm"
                              onClick={() => handleApprove(s.scenIdx)}
                            >
                              승인
                            </button>
                            <button
                              className="account-btn account-btn-warning account-btn-sm"
                              onClick={() => handleReject(s.scenIdx)}
                            >
                              반려
                            </button>
                          </>
                        )}
                        <button
                          className="account-btn account-btn-danger account-btn-sm"
                          onClick={() => handleDelete(s.scenIdx)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
