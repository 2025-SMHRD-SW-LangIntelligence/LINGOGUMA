import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/shared/api/client";
import "@/shared/styles/MyPage.css";
import "@/shared/styles/AdminPage.css";

/** ========= 백엔드 응답 타입 (필요 최소) ========= */
type ScenarioRow = {
  scenIdx: number;
  scenTitle: string;
  scenSummary: string;
  scenLevel: number;
  scenAccess: "FREE" | "MEMBER";
  scenStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  contentJson?: string | null; // 작성 페이지에서 만든 JSON 문자열
};

/** ========= contentJson 구조 타입 ========= */
type CharacterDoc = {
  id: string;
  name: string;
  role?: string;
  job?: string;
  personality?: string;
  speaking_style?: string;
  truth_bias?: number;
  alibi?: { where?: string; time_range?: string; details?: string };
  mission?: string;
  outfit?: string;
  sample_line?: string;
  avatar?: string;
  full?: string;
};

type EvidenceDoc = {
  id: string;
  name: string;
  desc?: string;
  importance?: "HIGH" | "MEDIUM" | "LOW" | string;
  attributes?: string[];
};

type LocationDoc = { id: string; name: string; desc?: string };
type TimelineDoc = { id: string; time: string; event: string };

type ContentJson = {
  scenario?: {
    id?: string;
    title?: string;
    summary?: string;
    difficulty?: number;
    objective?: string;
  };
  locations?: LocationDoc[];
  timeline?: TimelineDoc[];
  characters?: CharacterDoc[];
  evidence?: EvidenceDoc[];
  answer?: {
    culprit?: string; // character id
    motive?: string;
    method?: string;
    key_evidence?: string[]; // evidence ids
  };
};

export default function AdminScenarioDetailPage() {
  const { id } = useParams(); // /admin/scenarios/:id
  const nav = useNavigate();

  const [row, setRow] = useState<ScenarioRow | null>(null);
  const [json, setJson] = useState<ContentJson | null>(null);
  const [loading, setLoading] = useState(false);

  // ============== 로딩 ==============
  const fetchDetail = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<ScenarioRow>(`scenarios/${id}`);
      setRow(data ?? null);

      // contentJson 파싱 (문자열일 수 있음)
      if (data?.contentJson) {
        try {
          const parsed: ContentJson =
            typeof data.contentJson === "string"
              ? JSON.parse(data.contentJson)
              : (data.contentJson as any);
          setJson(parsed);
        } catch {
          setJson(null);
        }
      } else {
        setJson(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ============== 액션 ==============
  const approve = async () => {
    if (!row) return;
    await api.post(`/admin/scenarios/${row.scenIdx}/approve`);
    alert("승인 완료");
    setRow({ ...row, scenStatus: "PUBLISHED" });
  };

  const reject = async () => {
    if (!row) return;
    await api.post(`/admin/scenarios/${row.scenIdx}/reject`);
    alert("반려 완료");
    setRow({ ...row, scenStatus: "ARCHIVED" });
  };

  const remove = async () => {
    if (!row) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await api.delete(`/admin/scenarios/${row.scenIdx}`);
    alert("삭제 완료");
    nav("/admin/scenarios");
  };

  const difficultyLabel = useMemo(() => {
    const d = row?.scenLevel ?? json?.scenario?.difficulty ?? 1;
    return d === 1 ? "쉬움" : d === 2 ? "보통" : "어려움";
  }, [row, json]);

  if (loading) return <p className="admin-loading">불러오는 중…</p>;
  if (!row) return <p className="form-error">시나리오를 찾을 수 없습니다.</p>;

  return (
    <section className="account-section admin-section--wide">
      <div className="admin-breadcrumb">
        <button className="account-btn account-btn-sm" onClick={() => nav(-1)}>
          ← 목록으로
        </button>
      </div>

      <h3 className="mypage-section-title">시나리오 상세</h3>

      <div className="account-card">
        <div className="account-card-body">
          {/* 메타 정보 */}
          <div className="detail-grid">
            <div>
              <div className="detail-label">제목</div>
              <div className="detail-value">{row.scenTitle}</div>
            </div>
            <div>
              <div className="detail-label">요약</div>
              <div className="detail-value">{row.scenSummary}</div>
            </div>
            <div>
              <div className="detail-label">난이도</div>
              <div className="detail-value">{difficultyLabel}</div>
            </div>
            <div>
              <div className="detail-label">접근</div>
              <div className="detail-value">{row.scenAccess}</div>
            </div>
            <div>
              <div className="detail-label">상태</div>
              <div className="detail-value">
                <span
                  className={`status-badge status-${row.scenStatus.toLowerCase()}`}
                >
                  {row.scenStatus}
                </span>
              </div>
            </div>
            <div>
              <div className="detail-label">ID</div>
              <div className="detail-value mono">{row.scenIdx}</div>
            </div>
          </div>

          {/* contentJson 요약 (있을 때만) */}
          {json && (
            <>
              <hr className="admin-divider" />

              {/* 시나리오 개요 */}
              <h4 className="panel-subtitle">시나리오 개요</h4>
              <div className="detail-grid">
                <div>
                  <div className="detail-label">내부 ID</div>
                  <div className="detail-value mono">
                    {json.scenario?.id ?? "-"}
                  </div>
                </div>
                <div>
                  <div className="detail-label">목표</div>
                  <div className="detail-value">
                    {json.scenario?.objective ?? "범인·동기·수법·증거를 특정"}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="detail-label">시놉시스</div>
                  <div className="detail-value">
                    {json.scenario?.summary ?? "-"}
                  </div>
                </div>
              </div>

              {/* 등장인물 */}
              <h4 className="panel-subtitle">등장인물</h4>
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>ID</th>
                      <th style={{ width: 160 }}>이름</th>
                      <th>직업/역할</th>
                      <th style={{ width: 120 }}>진실성향</th>
                      <th>알리바이</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(json.characters ?? []).map((c) => (
                      <tr key={c.id}>
                        <td className="mono">{c.id}</td>
                        <td>{c.name}</td>
                        <td>{c.job || c.role || "-"}</td>
                        <td>{c.truth_bias ?? "-"}</td>
                        <td>
                          {c.alibi
                            ? [
                                c.alibi.where,
                                c.alibi.time_range,
                                c.alibi.details,
                              ]
                                .filter(Boolean)
                                .join(" / ")
                            : "-"}
                        </td>
                      </tr>
                    ))}
                    {(!json.characters || json.characters.length === 0) && (
                      <tr>
                        <td colSpan={5} className="account-empty">
                          등록된 인물이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 단서/증거 */}
              <h4 className="panel-subtitle">단서 · 증거</h4>
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>ID</th>
                      <th style={{ width: 200 }}>이름</th>
                      <th>설명</th>
                      <th style={{ width: 120 }}>중요도</th>
                      <th style={{ width: 240 }}>속성</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(json.evidence ?? []).map((e) => (
                      <tr key={e.id}>
                        <td className="mono">{e.id}</td>
                        <td>{e.name}</td>
                        <td>{e.desc ?? "-"}</td>
                        <td>{e.importance ?? "-"}</td>
                        <td>{(e.attributes ?? []).join(", ") || "-"}</td>
                      </tr>
                    ))}
                    {(!json.evidence || json.evidence.length === 0) && (
                      <tr>
                        <td colSpan={5} className="account-empty">
                          등록된 단서가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 장소 */}
              <h4 className="panel-subtitle">장소</h4>
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>ID</th>
                      <th style={{ width: 220 }}>이름</th>
                      <th>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(json.locations ?? []).map((l) => (
                      <tr key={l.id}>
                        <td className="mono">{l.id}</td>
                        <td>{l.name}</td>
                        <td>{l.desc ?? "-"}</td>
                      </tr>
                    ))}
                    {(!json.locations || json.locations.length === 0) && (
                      <tr>
                        <td colSpan={3} className="account-empty">
                          등록된 장소가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 타임라인 */}
              <h4 className="panel-subtitle">타임라인</h4>
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: 160 }}>시간</th>
                      <th>사건</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(json.timeline ?? []).map((t) => (
                      <tr key={t.id}>
                        <td>{t.time}</td>
                        <td>{t.event}</td>
                      </tr>
                    ))}
                    {(!json.timeline || json.timeline.length === 0) && (
                      <tr>
                        <td colSpan={2} className="account-empty">
                          등록된 타임라인이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 정답 */}
              <h4 className="panel-subtitle">정답(관리자 전용)</h4>
              <div className="detail-grid">
                <div>
                  <div className="detail-label">범인 ID</div>
                  <div className="detail-value mono">
                    {json.answer?.culprit ?? "-"}
                  </div>
                </div>
                <div>
                  <div className="detail-label">동기</div>
                  <div className="detail-value">
                    {json.answer?.motive ?? "-"}
                  </div>
                </div>
                <div>
                  <div className="detail-label">수법</div>
                  <div className="detail-value">
                    {json.answer?.method ?? "-"}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="detail-label">핵심 증거</div>
                  <div className="detail-value mono">
                    {(json.answer?.key_evidence ?? []).join(", ") || "-"}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 하단 버튼 */}
          <hr className="admin-divider" />
          <div className="admin-actions">
            {row.scenStatus === "DRAFT" && (
              <>
                <button
                  className="account-btn account-btn-primary"
                  onClick={approve}
                >
                  승인
                </button>
                <button
                  className="account-btn account-btn-warning"
                  onClick={reject}
                >
                  반려
                </button>
              </>
            )}
            <button
              className="account-btn"
              onClick={() => nav(`/author/scenarios/${row.scenIdx}/edit`)}
            >
              수정 페이지로
            </button>
            <button className="account-btn account-btn-danger" onClick={remove}>
              삭제
            </button>
            <button
              className="account-btn account-btn-ghost"
              onClick={() => nav("/admin/scenarios")}
            >
              목록
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
