package com.lingoguma.detective_backend.game.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lingoguma.detective_backend.game.entity.GameResult;
import lombok.Data;

import java.util.LinkedHashMap;
import java.util.Map;

@Data
public class GameResultResponse {
    private Integer resultId;
    private Integer sessionId;
    private Integer scenIdx;
    private Integer userIdx;
    private Map<String, Object> answerJson;  // JSON -> Map (정규화 포함)
    private Map<String, Object> skillsJson;  // JSON -> Map
    private boolean correct;                 // boolean은 isCorrect 대신 correct로

    public static GameResultResponse fromEntity(GameResult entity, ObjectMapper mapper) {
        GameResultResponse dto = new GameResultResponse();
        dto.setResultId(entity.getResultId());
        dto.setSessionId(entity.getSessionId());
        dto.setScenIdx(entity.getScenIdx());
        dto.setUserIdx(entity.getUserIdx());
        dto.setCorrect(entity.isCorrect());

        try {
            if (entity.getAnswerJson() != null) {
                Map<String, Object> raw = mapper.readValue(
                        entity.getAnswerJson(),
                        new TypeReference<Map<String, Object>>() {}
                );
                dto.setAnswerJson(normalizeAnswer(raw));
            }
            if (entity.getSkillsJson() != null) {
                dto.setSkillsJson(mapper.readValue(
                        entity.getSkillsJson(),
                        new TypeReference<Map<String, Object>>() {}
                ));
            }
        } catch (Exception e) {
            throw new RuntimeException("JSON 변환 실패", e);
        }

        return dto;
    }

    /**
     * 예전/혼합 스키마를 새 스키마(culprit, motive, method, evidence, time)로 보강.
     * - 원본 키는 그대로 두되, 새 키가 비어 있으면 매핑하여 채워준다.
     * - time은 옵션으로 유지(과거 '언제?' 값을 참고).
     */
    private static Map<String, Object> normalizeAnswer(Map<String, Object> src) {
        if (src == null) return null;

        // 읽기 헬퍼
        String culprit  = pickString(src, "culprit");
        String motive   = firstNonEmpty(
                pickString(src, "motive"),
                pickString(src, "why")        // 예전: 왜? → motive
        );
        String method   = firstNonEmpty(
                pickString(src, "method"),
                pickString(src, "how")        // 예전: 어떻게? → method
        );
        String evidence = firstNonEmpty(
                pickString(src, "evidence"),
                pickString(src, "evidenceText") // ★ 프론트가 evidenceText로 보낸 경우
        );
        String time     = firstNonEmpty(
                pickString(src, "time"),
                pickString(src, "when")       // 예전: 언제? → time
        );

        // 새 스키마 우선으로 정렬된 맵 구성
        LinkedHashMap<String, Object> out = new LinkedHashMap<>();
        if (culprit  != null) out.put("culprit",  culprit);
        if (motive   != null) out.put("motive",   motive);
        if (method   != null) out.put("method",   method);
        if (evidence != null) out.put("evidence", evidence);
        if (time     != null) out.put("time",     time);

        // 원본 키도 보존(중복 키는 건너뜀)
        for (Map.Entry<String, Object> e : src.entrySet()) {
            out.putIfAbsent(e.getKey(), e.getValue());
        }
        return out;
    }

    private static String pickString(Map<String, Object> src, String key) {
        Object v = src.get(key);
        if (v == null) return null;
        String s = String.valueOf(v).trim();
        return s.isEmpty() ? null : s;
    }

    private static String firstNonEmpty(String a, String b) {
        return (a != null && !a.isEmpty()) ? a : (b != null && !b.isEmpty() ? b : null);
    }
}
