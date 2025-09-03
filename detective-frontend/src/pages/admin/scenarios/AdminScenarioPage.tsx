import { useEffect, useState } from "react";
import { api } from "@/shared/api/client";

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
            setScenarios(data);
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

    // ------------------------------
    // 렌더링
    // ------------------------------
    return (
        <div>
            <h2>시나리오 관리</h2>

            {/* 상태 필터 */}
            <div style={{ marginBottom: 12 }}>
                <label>상태 필터: </label>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                >
                    <option value="ALL">전체</option>
                    <option value="DRAFT">DRAFT (대기)</option>
                    <option value="PUBLISHED">PUBLISHED (승인됨)</option>
                    <option value="ARCHIVED">ARCHIVED (반려됨)</option>
                </select>
            </div>

            {loading ? (
                <p>시나리오 로딩 중...</p>
            ) : (
                <table
                    border={1}
                    cellPadding={8}
                    style={{ width: "100%", borderCollapse: "collapse" }}
                >
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>제목</th>
                            <th>요약</th>
                            <th>상태</th>
                            <th>액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scenarios.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: "center" }}>
                                    시나리오가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            scenarios.map((s) => (
                                <tr key={s.scenIdx}>
                                    <td>{s.scenIdx}</td>
                                    <td>{s.scenTitle}</td>
                                    <td>{s.scenSummary}</td>
                                    <td>{s.scenStatus}</td>
                                    <td>
                                        {s.scenStatus === "DRAFT" && (
                                            <>
                                                <button
                                                    onClick={() =>
                                                        handleApprove(s.scenIdx)
                                                    }
                                                >
                                                    승인
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleReject(s.scenIdx)
                                                    }
                                                >
                                                    반려
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() =>
                                                handleDelete(s.scenIdx)
                                            }
                                        >
                                            삭제
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
}
