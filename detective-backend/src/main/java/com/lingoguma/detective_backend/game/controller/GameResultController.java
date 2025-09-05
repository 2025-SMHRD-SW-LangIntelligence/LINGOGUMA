package com.lingoguma.detective_backend.game.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lingoguma.detective_backend.game.dto.GameResultResponse;
import com.lingoguma.detective_backend.game.entity.GameResult;
import com.lingoguma.detective_backend.game.repository.GameResultRepository;
import com.lingoguma.detective_backend.game.service.GameNlpClient;
import com.lingoguma.detective_backend.game.service.GameSessionService;
import com.lingoguma.detective_backend.scenario.entity.Scenario;
import com.lingoguma.detective_backend.user.entity.CustomUserDetails;
import com.lingoguma.detective_backend.user.entity.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/game-results")
@RequiredArgsConstructor
public class GameResultController {

    private final GameResultRepository repo;
    private final ObjectMapper mapper; // ObjectMapper 주입

    // ⬇️ 유사도 계산에 필요 (추가)
    private final GameSessionService sessionService;
    private final GameNlpClient nlpClient;

    // ==============================
    // 로그인한 사용자의 게임 기록 조회
    // ==============================
    @GetMapping("/me")
    public ResponseEntity<List<GameResultResponse>> getMyResults(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        Integer userIdx = userDetails.getUser().getUserIdx();

        List<GameResultResponse> results = repo.findByUserIdx(userIdx).stream()
                .map(gr -> GameResultResponse.fromEntity(gr, mapper))
                .toList();

        return ResponseEntity.ok(results);
    }

    // ==============================
    // 단일 결과 조회 (본인만 / ADMIN은 다른 유저 것도 가능)
    // ==============================
    @GetMapping("/{resultId}")
    public ResponseEntity<GameResultResponse> getOneResult(
        @PathVariable Integer resultId,
        @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        // 게스트( userIdx=null )는 권한 체크 없이 허용
        GameResult gr = repo.findById(resultId).orElseThrow(() -> new RuntimeException("결과없음"));
        if (gr.getUserIdx() == null) {
            return ResponseEntity.ok(GameResultResponse.fromEntity(gr, mapper));
        }
        // 회원이면 본인/ADMIN만 허용
        if (userDetails == null) return ResponseEntity.status(401).build();
        if (!gr.getUserIdx().equals(userDetails.getUser().getUserIdx())
            && userDetails.getUser().getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(GameResultResponse.fromEntity(gr, mapper));
    }

    // ==============================
    // 세션 ID 기반 결과 조회 (AnalysisPage에서 사용)
    // ==============================
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<GameResultResponse> getBySessionId(
            @PathVariable Integer sessionId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        GameResult result = repo.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("결과를 찾을 수 없습니다."));

        // 게스트 플레이( userIdx=null )는 로그인 필요 없음
        if (result.getUserIdx() == null) {
            return ResponseEntity.ok(GameResultResponse.fromEntity(result, mapper));
        }

        // 회원 플레이일 경우만 권한 체크
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        if (!result.getUserIdx().equals(userDetails.getUser().getUserIdx())
                && userDetails.getUser().getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }

        return repo.findTopBySessionIdOrderByResultIdDesc(sessionId)
            .map(gr -> ResponseEntity.ok(GameResultResponse.fromEntity(gr, mapper)))
            .orElse(ResponseEntity.notFound().build());
    }

    // ==============================
    // 관리자 전용: 특정 유저 기록 조회
    // ==============================
    @GetMapping("/user/{userIdx}")
    public ResponseEntity<List<GameResultResponse>> getUserResults(
            @PathVariable Integer userIdx,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        if (userDetails == null || userDetails.getUser().getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }

        List<GameResultResponse> results = repo.findByUserIdx(userIdx).stream()
                .map(gr -> GameResultResponse.fromEntity(gr, mapper))
                .toList();

        return ResponseEntity.ok(results);
    }

    // ==============================
    // 관리자 전용: 전체 게임 기록 조회
    // ==============================
    @GetMapping("/all")
    public ResponseEntity<List<GameResultResponse>> getAllResults(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        if (userDetails == null || userDetails.getUser().getRole() != Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }

        List<GameResultResponse> results = repo.findAll().stream()
                .map(gr -> GameResultResponse.fromEntity(gr, mapper))
                .toList();

        return ResponseEntity.ok(results);
    }

    // ===========================================================
    // ✅ 정답 유사도 계산 (O/X 및 점수)  —  LLM-detective 버전 보강
    // ===========================================================
    @GetMapping("/{resultId}/similarity")
    public ResponseEntity<SimilarityRes> getSimilarity(
            @PathVariable Integer resultId,
            @RequestParam(value = "threshold", required = false, defaultValue = "0.72") double threshold,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        GameResult gr = repo.findById(resultId).orElseThrow(() -> new RuntimeException("결과없음"));

        // 권한: 게스트 허용, 회원이면 본인/ADMIN
        if (gr.getUserIdx() != null) {
            if (userDetails == null) return ResponseEntity.status(401).build();
            if (!gr.getUserIdx().equals(userDetails.getUser().getUserIdx())
                    && userDetails.getUser().getRole() != Role.ADMIN) {
                return ResponseEntity.status(403).build();
            }
        }

        try {
            // 플레이어 답변
            Map<String, Object> ans = gr.getAnswerJson() != null
                    ? mapper.readValue(gr.getAnswerJson(), new TypeReference<Map<String, Object>>() {})
                    : Map.of();
            String playerCulprit = str(ans.get("culprit"));
            String playerMotive  = firstNonEmpty(str(ans.get("why")), str(ans.get("motive")));
            String playerMethod  = firstNonEmpty(str(ans.get("how")), str(ans.get("method")));
            String playerEvidenceText = str(ans.get("evidenceText"));

            // 시나리오 정답
            Scenario scenario = sessionService.getScenario(gr.getSessionId());
            Map<String, Object> content = mapper.readValue(
                    scenario.getContentJson(),
                    new TypeReference<Map<String, Object>>() {}
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> answer = (Map<String, Object>) content.getOrDefault("answer", Map.of());

            String truthCulpritId = str(answer.get("culprit"));
            String truthMotive    = str(answer.get("motive"));
            String truthMethod    = str(answer.get("method"));

            @SuppressWarnings("unchecked")
            List<Object> keyEvIdsRaw = (List<Object>) answer.getOrDefault("key_evidence", List.of());
            List<String> keyEvIds = keyEvIdsRaw.stream().map(String::valueOf).collect(Collectors.toList());

            // 캐릭터(id→name)
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> characters =
                    (List<Map<String, Object>>) content.getOrDefault("characters", List.of());
            Map<String, String> charIdToName = new HashMap<>();
            for (Map<String, Object> c : characters) {
                String cid = str(c.get("id"));
                String cnm = str(c.get("name"));
                if (!cid.isBlank() && !cnm.isBlank()) charIdToName.put(cid, cnm);
            }
            String truthCulpritName = charIdToName.getOrDefault(truthCulpritId, truthCulpritId);

            // 증거(id→name)
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> evList =
                    (List<Map<String, Object>>) content.getOrDefault("evidence", List.of());
            Map<String, String> evIdToName = new HashMap<>();
            for (Map<String, Object> ev : evList) {
                String id = str(ev.get("id"));
                String nm = str(ev.get("name"));
                if (!id.isBlank() && !nm.isBlank()) evIdToName.put(id, nm);
            }

            // ------ 동기/수법 유사도 (FastAPI 1회 호출)
            Map<String, Object> req = new HashMap<>();
            req.put("motive_player",  playerMotive);
            req.put("motive_truth",   truthMotive);
            req.put("method_player",  playerMethod);
            req.put("method_truth",   truthMethod);
            Map<String, Object> sim = Map.of();
            try {
                sim = nlpClient.similarity(req);
            } catch (Exception ignore) { /* 서버 장애 시 0 처리 */ }

            double sMotive = toDouble(sim.get("sim_motive"), 0.0);
            double sMethod = toDouble(sim.get("sim_method"), 0.0);

            boolean vCulprit = sameCulprit(playerCulprit, truthCulpritId, truthCulpritName);
            boolean vMotive  = sMotive >= threshold;
            boolean vMethod  = sMethod >= threshold;

            // ------ 증거 브레이크다운 (임계값 적용 + 보수적 부분일치)
            double evidenceThreshold = Math.max(0.72, threshold); // 너무 관대해지지 않게
            List<String> pieces = splitPieces(playerEvidenceText);
            List<PlayerEvidenceDTO> breakdown = new ArrayList<>();
            List<Double> pieceScores = new ArrayList<>();

            for (String p : pieces) {
                if (p.isBlank()) continue;

                String bestIdTmp = null;
                String bestNameTmp = null;
                double best = 0.0;

                for (Map.Entry<String, String> entry : evIdToName.entrySet()) {
                    String id = entry.getKey();
                    String nm = entry.getValue();
                    double score = scoreEvidence(p, nm);

                    if (score > best) {
                        best = score;
                        bestIdTmp = id;
                        bestNameTmp = nm;
                    }
                }

                // 핵심 증거인지 체크
                boolean isKey = false;
                if (bestIdTmp != null) {
                    for (String kid : keyEvIds) {
                        if (bestIdTmp.equals(kid)) { isKey = true; break; }
                    }
                }
                boolean matched = isKey && best >= evidenceThreshold;

                breakdown.add(new PlayerEvidenceDTO(p, matched, bestIdTmp, bestNameTmp));
                pieceScores.add(best);
            }

            // 증거 전체 점수(참고용): 각 조각의 best score 평균
            double sEvidence = 0.0;
            if (!pieceScores.isEmpty()) {
                sEvidence = pieceScores.stream().mapToDouble(d -> d).average().orElse(0.0);
            }

            // 평균/합격
            double sCulprit = vCulprit ? 1.0 : 0.0;
            double avg3 = (sCulprit + sMotive + sMethod) / 3.0;
            double avg4 = (sCulprit + sMotive + sMethod + sEvidence) / 4.0;

            SimilarityRes out = new SimilarityRes();
            out.sim_culprit = sCulprit;
            out.sim_motive = sMotive;
            out.sim_method = sMethod;
            out.sim_evidence = sEvidence;
            out.sim_avg3 = avg3;
            out.sim_avg = avg4;
            out.threshold = threshold;
            out.passed3 = avg3 >= threshold;
            out.passed = avg4 >= threshold;

            out.verdict = new VerdictDTO(vCulprit, vMotive, vMethod);
            out.evidence_breakdown = breakdown;

            return ResponseEntity.ok(out);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    // ---------------------------
    // 헬퍼들 (추가)
    // ---------------------------
    private static String str(Object o) { return o == null ? "" : String.valueOf(o).trim(); }

    private static String firstNonEmpty(String a, String b) {
        return (a != null && !a.isBlank()) ? a : (b == null ? "" : b);
    }

    private static double toDouble(Object o, double def) {
        if (o instanceof Number n) return n.doubleValue();
        if (o instanceof String s) {
            try { return Double.parseDouble(s); } catch (Exception ignored) {}
        }
        return def;
    }

    private static List<String> splitPieces(String text) {
        if (text == null) return List.of();
        return Arrays.stream(text.split("[,\\n\\r;·•]+"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .limit(12)
                .collect(Collectors.toList());
    }

    private static String norm(String s) {
        if (s == null) return "";
        return s.toLowerCase().replaceAll("[\\s\\p{Punct}]+", "");
    }

    private static boolean containsStrict(String player, String truthName) {
        // '통화' vs '통화기록' 같은 과잉매칭을 막기 위해 truth 전체명이 player 안에 들어간 경우만 인정(2자 이상)
        String p = norm(player);
        String t = norm(truthName);
        return t.length() >= 2 && p.contains(t);
    }

    private double scoreEvidence(String player, String truthName) {
        // 1) 보수적 부분일치(정답 "전체명"이 포함될 때만)
        if (containsStrict(player, truthName)) return 1.0;

        // 2) FastAPI 유사도
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("evidence_player", player);
            req.put("evidence_truth", truthName);
            Map<String, Object> resp = nlpClient.similarity(req);
            return toDouble(resp.get("sim_evidence"), 0.0);
        } catch (Exception e) {
            return 0.0;
        }
    }

    private static boolean sameCulprit(String playerCulprit, String truthId, String truthName) {
        String g = str(playerCulprit);
        if (g.isBlank()) return false;
        // ID로 보낸 경우 또는 이름으로 보낸 경우 모두 허용
        return g.equalsIgnoreCase(truthId) || g.equalsIgnoreCase(truthName);
    }

    // ---------------------------
    // 응답 DTO (간단 POJO)
    // ---------------------------
    public static class VerdictDTO {
        public boolean culprit;
        public boolean motive;
        public boolean method;
        public VerdictDTO() {}
        public VerdictDTO(boolean c, boolean m, boolean md) {
            this.culprit = c; this.motive = m; this.method = md;
        }
    }

    public static class PlayerEvidenceDTO {
        public String text;
        public boolean matched;
        public String matchedId;
        public String matchedName;
        public PlayerEvidenceDTO() {}
        public PlayerEvidenceDTO(String t, boolean m, String id, String name) {
            this.text = t; this.matched = m; this.matchedId = id; this.matchedName = name;
        }
    }

    public static class SimilarityRes {
        public double sim_culprit;
        public double sim_motive;
        public double sim_method;
        public double sim_evidence;
        public double sim_avg;
        public double sim_avg3;
        public double threshold;
        public boolean passed;
        public boolean passed3;
        public VerdictDTO verdict;
        public List<PlayerEvidenceDTO> evidence_breakdown;
    }
}
