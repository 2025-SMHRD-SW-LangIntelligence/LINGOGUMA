// src/main/java/com/lingoguma/detective_backend/scenario/dto/ScenarioResponse.java
package com.lingoguma.detective_backend.scenario.dto;

import com.lingoguma.detective_backend.scenario.entity.Scenario;
import com.lingoguma.detective_backend.scenario.entity.ScenarioStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ScenarioResponse {
    private Long id;
    private String title;
    private String content;
    private ScenarioStatus status;

    private Long authorIndex;   // User PK(Long)
    private String authorId;    // 로그인 식별자(String)
    private String authorEmail;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime submittedAt;

    public static ScenarioResponse from(Scenario s) {
        return ScenarioResponse.builder()
                .id(s.getId())
                .title(s.getTitle())
                .content(s.getContent())
                .status(s.getStatus())
                .authorIndex(s.getAuthor().getIndex())
                .authorId(s.getAuthor().getId())
                .authorEmail(s.getAuthor().getEmail())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .submittedAt(s.getSubmittedAt())
                .build();
    }
}
