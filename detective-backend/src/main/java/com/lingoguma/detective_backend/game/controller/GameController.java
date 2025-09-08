package com.lingoguma.detective_backend.game.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lingoguma.detective_backend.game.dto.*;
import com.lingoguma.detective_backend.game.service.*;
import com.lingoguma.detective_backend.scenario.entity.Scenario;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/game")
@RequiredArgsConstructor
public class GameController {

    private final GptClient gptClient;
    private final GameSessionService sessionService;
    private final ObjectMapper mapper;
    private final GameResultService resultService;
    private final GameNlpClient nlpClient;

    // ==============================
    // 세션 시작
    // ==============================
    @PostMapping("/session/start")
    public ResponseEntity<Integer> startSession(
            @RequestParam Integer scenIdx,
            @RequestParam(required = false) Integer userIdx
    ) {
        Integer sessionId = sessionService.startSession(scenIdx, userIdx);
        return ResponseEntity.ok(sessionId);
    }

    // ==============================
    // 질문하기 (GPT 호출 + 로그 저장)
    // ==============================
    @PostMapping("/ask")
    public ResponseEntity<NlpAskResponse> ask(@RequestBody NlpAskRequest req) {
        // 1. 직전 로그 불러오기
        Map<String, Object> logMap;
        try {
            logMap = mapper.readValue(
                    sessionService.getLogJson(req.getSessionId()),
                    new TypeReference<Map<String, Object>>() {}
            );
        } catch (Exception e) {
            logMap = Map.of("logs", List.of());
        }

        // 2. 시나리오 content_json 읽기
        Scenario scenario = sessionService.getScenario(req.getSessionId());
        Map<String, Object> content;
        try {
            content = mapper.readValue(
                    scenario.getContentJson(),
                    new TypeReference<Map<String, Object>>() {}
            );
        } catch (Exception e) {
            content = Map.of();
        }

        // prompt + characters
        @SuppressWarnings("unchecked")
        Map<String, Object> promptConfig = (Map<String, Object>) content.getOrDefault("prompt", Map.of());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> characters = (List<Map<String, Object>>) content.getOrDefault("characters", List.of());

        // 캐릭터 찾기
        Map<String, Object> suspect = characters.stream()
                .filter(c -> req.getSuspectName().equals(c.get("name")))
                .findFirst()
                .orElse(Map.of());

        // system 프롬프트 구성
        String mission = (String) promptConfig.getOrDefault("mission", "너는 사건 속 등장인물 중 하나다.");
        @SuppressWarnings("unchecked")
        //List<String> rules = (List<String>) promptConfig.getOrDefault("rules", List.of());
        List<String> rulesInScenario = (List<String>) promptConfig.get("rules");
        List<String> rules = (rulesInScenario != null && !rulesInScenario.isEmpty())
        ? rulesInScenario
        : List.of(
            // 공통
            "플레이어는 탐정이다. 반드시 플레이어의 질문과 요청에 집중한다.",
            "사건과 무관한 잡담은 하지 않는다.",
            "항상 캐릭터 설정(신상, 성격, 말투)을 유지한다.",
            // 용의자
            "용의자는 자신의 알리바이를 일관성 있게 유지한다.",
            "용의자는 증거와 명백히 모순되는 발언은 피한다.",
            // "거짓말은 가능하지만 들키면 안 된다.",
            "용의자는 플레이어의 추리에 도움을 주지 않고, 자신의 시점에서만 대답한다.",
            // 액션
            "액션은 객관적 사실과 증거만 제시한다.",
            "액션은 추측이나 의견은 하지 않는다.",
            "액션은 플레이어가 요청할 때만 정보를 제공한다.",
            "액션은 증거를 원본 그대로 전달하며 변형하지 않는다.",
            "액션은 사건의 결과나 정답을 직접 말하지 않고, 단서만 보여준다.",
            "액션은 현장 조사, CCTV 확인, 물건 검색, 기록 조회, 목격자 증언 수집 등을 수행합니다.",
            "액션은 나의 행동이다."
            // 소문
            

            
        );

        StringBuilder systemPrompt = new StringBuilder();
        systemPrompt.append(mission).append("\n");
        if (!rules.isEmpty()) {
            systemPrompt.append("규칙:\n");
            for (String r : rules) {
                systemPrompt.append("- ").append(r).append("\n");
            }
        }

        // [ADD] 소문 전용 규칙 추가 (프롬프트만으로 제어)
        systemPrompt.append("\n[소문 규칙]\n");
        systemPrompt.append("- 사용자가 \"소문을 조사한다\"라고 입력하면, 아래 [rumors] 목록만 줄바꿈으로 그대로 출력한다.\n");
        systemPrompt.append("- 부가 설명, 요약, 분석, 감정 표현은 금지한다.\n");

        // 게임 설명
        systemPrompt.append("게임 설명:\n");
        systemPrompt.append("용의자의 신상 및 성격, 관련 단서 등을 바탕으로 그 용의자가 되어서 플레이어와 대화하는 방식의 추리게임이다 (플레이어는 탐정이다)\n");
        systemPrompt.append("액션 버튼은 조수이다\n");

        // 캐릭터 상세 정보
        systemPrompt.append("\n### 너의 캐릭터 정보 ###\n");
        systemPrompt.append("이름: ").append(suspect.getOrDefault("name", "알 수 없는 인물")).append("\n");
        systemPrompt.append("직업: ").append(suspect.getOrDefault("job", "알 수 없음")).append("\n");
        systemPrompt.append("나이: ").append(suspect.getOrDefault("age", "알 수 없음")).append("\n");
        systemPrompt.append("성별: ").append(suspect.getOrDefault("gender", "알 수 없음")).append("\n");
        systemPrompt.append("성격: ").append(suspect.getOrDefault("personality", "알 수 없음")).append("\n");
        systemPrompt.append("말투: ").append(suspect.getOrDefault("speaking_style", "알 수 없음")).append("\n");
        systemPrompt.append("옷차림: ").append(suspect.getOrDefault("outfit", "알 수 없음")).append("\n");
        systemPrompt.append("알리바이: ").append(
                suspect.containsKey("alibi") ? suspect.get("alibi").toString() : "알 수 없음"
        ).append("\n");
        systemPrompt.append("임무: ").append(suspect.getOrDefault("mission", "알 수 없음")).append("\n");
        systemPrompt.append("샘플 대사: ").append(suspect.getOrDefault("sample_line", "없음")).append("\n");

        systemPrompt.append("\n반드시 위 캐릭터 설정과 말투를 유지해서 대답하라.\n");

        List<Map<String, String>> messages = new java.util.ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt.toString()));

        // 3. 이전 로그 이어붙임
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> logs = (List<Map<String, Object>>) logMap.getOrDefault("logs", List.of());
        for (Map<String, Object> l : logs) {
            String role = "PLAYER".equals(l.get("speaker")) ? "user" : "assistant";
            String contentMsg = (String) l.getOrDefault("message", "");
            if (contentMsg != null && !contentMsg.isBlank()) {
                messages.add(Map.of("role", role, "content", contentMsg));
            }
        }

        // 4. 현재 질문 추가
        messages.add(Map.of(
                "role", "user",
                "content", "[용의자:" + req.getSuspectName() + "] 플레이어 질문: " + req.getUserText()
        ));

        // 5. GPT 호출
        String answer = gptClient.chat(messages);

        // 6. DB 로그 저장
        sessionService.appendLog(req.getSessionId(), req.getSuspectName(), req.getUserText(), answer);

        // 7. 응답 반환
        NlpAskResponse resp = new NlpAskResponse();
        resp.setAnswer(answer);
        return ResponseEntity.ok(resp);
    }

    // ==============================
    // 사건 종료 → NLP 분석 + 결과 저장
    // ==============================
    @PostMapping("/result")
    public ResponseEntity<Map<String, Integer>> finish(@RequestBody GameFinishRequest req) {
        try {
            // 1. 세션 로그
            String logJsonStr = sessionService.getLogJson(req.getSessionId());

            // 2. NLP 요청 DTO 준비
            NlpAnalyzeRequest analyzeReq = new NlpAnalyzeRequest();
            analyzeReq.setSessionId(req.getSessionId());
            analyzeReq.setLogJson(safeToMap(logJsonStr));

            Scenario scenario = sessionService.getScenario(req.getSessionId());
            Map<String, Object> content = mapper.readValue(
                    scenario.getContentJson(),
                    new TypeReference<Map<String, Object>>() {}
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> scenMeta = (Map<String, Object>) content.getOrDefault("scenario", Map.of());
            String caseTitle = (String) scenMeta.getOrDefault("title", scenario.getScenTitle());
            String caseSummary = (String) scenMeta.getOrDefault("summary", scenario.getScenSummary());

            java.util.List<String> facts = new java.util.ArrayList<>();
            @SuppressWarnings("unchecked")
            java.util.List<Map<String, Object>> characters =
                    (java.util.List<Map<String, Object>>) content.getOrDefault("characters", java.util.List.of());
            for (Map<String, Object> ch : characters) {
                Object alibi = ch.get("alibi");
                if (alibi != null) {
                    facts.add(ch.getOrDefault("name", "") + " 알리바이: " + alibi.toString());
                }
            }

            @SuppressWarnings("unchecked")
            java.util.List<Map<String, Object>> evidence =
                    (java.util.List<Map<String, Object>>) content.getOrDefault("evidence", java.util.List.of());
            for (Map<String, Object> ev : evidence) {
                String name = String.valueOf(ev.getOrDefault("name", ""));
                String desc = String.valueOf(ev.getOrDefault("desc", ""));
                if (!name.isBlank()) {
                    facts.add("증거: " + name + (desc.isBlank() ? "" : " - " + desc));
                }
            }

            @SuppressWarnings("unchecked")
            java.util.List<Map<String, Object>> timeline =
                    (java.util.List<Map<String, Object>>) content.getOrDefault("timeline", java.util.List.of());
            for (Map<String, Object> t : timeline) {
                String time = String.valueOf(t.getOrDefault("time", ""));
                String event = String.valueOf(t.getOrDefault("event", ""));
                if (!time.isBlank() && !event.isBlank()) {
                    facts.add("타임라인 " + time + ": " + event);
                }
            }

            if (facts.size() > 12) {
                facts = facts.subList(0, 12);
            }

            analyzeReq.setCaseTitle(caseTitle);
            analyzeReq.setCaseSummary(caseSummary);
            analyzeReq.setFacts(facts);
            analyzeReq.setFinalAnswer(req.getAnswerJson());
            analyzeReq.setTimings(req.getTimings());
            analyzeReq.setEngine("hf");

            // 3. FastAPI 호출
            NlpAnalyzeResponse analyzeResp = null;
            try {
                analyzeResp = nlpClient.analyze(analyzeReq);
            } catch (Exception e) {
                System.err.println("NLP 분석 서버 호출 실패(hf): " + e.getMessage());
            }
            if (analyzeResp == null) {
                // hf 실패 시 dummy 재시도
                try {
                    analyzeReq.setEngine("dummy");
                    analyzeResp = nlpClient.analyze(analyzeReq);
                    System.err.println("hf 실패 → dummy 엔진으로 대체 성공");
                } catch (Exception e) {
                    System.err.println("dummy 엔진도 실패: " + e.getMessage());
                }
            }

            // 4. skills 결정 (기존 5개 점수)
            Map<String, ?> chosen;
            if (req.getSkills() != null) {
                chosen = req.getSkills();
            } else if (analyzeResp != null && analyzeResp.getSkills() != null) {
                chosen = analyzeResp.getSkills();
            } else {
                chosen = Map.of();
            }
            Map<String, Integer> skillsToSave = coerceSkillInts(chosen);

            // [ADD] 4-1. 정답 유사도 계산 → skillsJson에 함께 저장
            Map<String, Object> answerTruth = (Map<String, Object>) content.getOrDefault("answer", Map.of());
            String truthMotive = str(answerTruth.get("motive"));
            String truthMethod = str(answerTruth.get("method"));
            // key_evidence: ["e1","e3"] → 이름으로 치환해 비교문자열 구성
            @SuppressWarnings("unchecked")
            List<Object> keyEvIds = (List<Object>) answerTruth.getOrDefault("key_evidence", List.of());
            Map<String, String> evIdToName = evidence.stream().collect(
                    Collectors.toMap(
                            ev -> String.valueOf(ev.getOrDefault("id", "")),
                            ev -> String.valueOf(ev.getOrDefault("name", "")),
                            (a, b) -> a,
                            LinkedHashMap::new
                    )
            );
            String truthEvidence = keyEvIds.stream()
                    .map(id -> evIdToName.getOrDefault(String.valueOf(id), String.valueOf(id)))
                    .collect(Collectors.joining(", "));

            Map<String, Object> ans = req.getAnswerJson() != null ? req.getAnswerJson() : Map.of();
            String playerMotive   = !str(ans.get("motive")).isEmpty()   ? str(ans.get("motive"))   : str(ans.get("why"));
            String playerMethod   = !str(ans.get("method")).isEmpty()   ? str(ans.get("method"))   : str(ans.get("how"));
            String playerEvidence = !str(ans.get("evidence")).isEmpty() ? str(ans.get("evidence")) : str(ans.get("evidenceText"));
            String playerTime     = !str(ans.get("time")).isEmpty()     ? str(ans.get("time"))     : str(ans.get("when"));
            String truthTime      = ""; // 필요시 content.answer.time 으로 확장

            Map<String, Object> simPayload = new HashMap<>();
            simPayload.put("motive_player",   playerMotive);
            simPayload.put("motive_truth",    truthMotive);
            simPayload.put("method_player",   playerMethod);
            simPayload.put("method_truth",    truthMethod);
            simPayload.put("evidence_player", playerEvidence);
            simPayload.put("evidence_truth",  truthEvidence);
            simPayload.put("time_player",     playerTime);
            simPayload.put("time_truth",      truthTime);

            Map<String, Object> simRes = null;
            try {
                simRes = nlpClient.similarity(simPayload); // ★ GameNlpClient에 메서드 추가 필요
            } catch (Exception e) {
                System.err.println("유사도 계산 실패: " + e.getMessage());
            }

            Map<String, Object> skillsJsonObj = new LinkedHashMap<>(skillsToSave);
            if (simRes != null) {
                Double sMot = asDouble(simRes.get("sim_motive"));
                Double sMet = asDouble(simRes.get("sim_method"));
                Double sEvd = asDouble(simRes.get("sim_evidence"));
                Double sTim = asDouble(simRes.get("sim_time"));
                if (sMot != null) skillsJsonObj.put("sim_motive", sMot);
                if (sMet != null) skillsJsonObj.put("sim_method", sMet);
                if (sEvd != null) skillsJsonObj.put("sim_evidence", sEvd);
                if (sTim != null) skillsJsonObj.put("sim_time", sTim);
                skillsJsonObj.put("sim_threshold", 0.75); // 프론트에서 O/X 임계값으로 사용
            }
            String skillsJsonStr = toJson(skillsJsonObj);

            // 5. 정답 여부 계산
            boolean isCorrect = checkCorrect(req);

            // 6. DB 저장
            Integer resultId = resultService.saveResult(req, skillsJsonStr, isCorrect);

            // 7. 세션 종료
            sessionService.finishSession(req.getSessionId());

            return ResponseEntity.ok(Map.of("resultId", resultId));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", -1));
        }
    }

    private boolean checkCorrect(GameFinishRequest req) {
        try {
            Scenario scenario = sessionService.getScenario(req.getSessionId());
            Map<String, Object> content = mapper.readValue(
                    scenario.getContentJson(),
                    new TypeReference<Map<String, Object>>() {}
            );

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> characters = (List<Map<String, Object>>) content.getOrDefault("characters", List.of());

            // ID/이름 모두 허용
            String realCulpritId = characters.stream()
                    .filter(c -> "범인".equals(c.get("role")))
                    .map(c -> (String) c.get("id"))
                    .findFirst()
                    .orElse(null);

            String realCulpritName = characters.stream()
                    .filter(c -> "범인".equals(c.get("role")))
                    .map(c -> (String) c.get("name"))
                    .findFirst()
                    .orElse(null);

            if (req.getAnswerJson() != null) {
                String chosen = str(req.getAnswerJson().get("culprit"));
                String chosenIdFallback  = str(req.getAnswerJson().get("culpritId"));
                String chosenIdFallback2 = str(req.getAnswerJson().get("selectedCulpritId"));
                String chosenNameFallback= str(req.getAnswerJson().get("culprit_name"));

                if (!chosen.isEmpty() && realCulpritId != null && chosen.equals(realCulpritId)) return true;
                if (!chosenIdFallback.isEmpty() && realCulpritId != null && chosenIdFallback.equals(realCulpritId)) return true;
                if (!chosenIdFallback2.isEmpty() && realCulpritId != null && chosenIdFallback2.equals(realCulpritId)) return true;
                if (!chosenNameFallback.isEmpty() && realCulpritName != null && chosenNameFallback.equals(realCulpritName)) return true;

                if (!chosen.isEmpty() && realCulpritName != null && chosen.equals(realCulpritName)) return true;
            }
        } catch (Exception e) {
            System.err.println("정답 검증 중 오류: " + e.getMessage());
        }
        return false;
    }

    // ==============================
    // util
    // ==============================
    private Map<String, Object> safeToMap(String json) {
        try {
            return mapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Map.of("logs", List.of());
        }
    }

    private String toJson(Object o) {
        try {
            return mapper.writeValueAsString(o);
        } catch (Exception e) {
            return "{}";
        }
    }

    private Map<String, Integer> coerceSkillInts(Map<String, ?> in) {
        HashMap<String, Integer> out = new HashMap<>();
        String[] keys = new String[]{"logic", "creativity", "focus", "diversity", "depth"};
        if (in != null) {
            for (String k : keys) {
                Object v = in.get(k);
                int iv = 0;
                if (v instanceof Number) {
                    iv = (int) Math.round(((Number) v).doubleValue());
                } else if (v instanceof String) {
                    try {
                        iv = (int) Math.round(Double.parseDouble((String) v));
                    } catch (Exception ignored) {}
                }
                if (iv < 0) iv = 0;
                if (iv > 100) iv = 100;
                out.put(k, iv);
            }
        }
        for (String k : keys) {
            if (!out.containsKey(k)) out.put(k, 0);
        }
        return out;
    }

    // [ADD] 안전 문자열/숫자
    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }
    private static Double asDouble(Object o) {
        if (o == null) return null;
        try {
            Double d = Double.valueOf(String.valueOf(o));
            if (d.isNaN() || d.isInfinite()) return null;
            return d;
        } catch (Exception e) {
            return null;
        }
    }
}
