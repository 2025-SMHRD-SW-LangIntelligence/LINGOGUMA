// src/main/java/com/lingoguma/detective_backend/scenario/dto/CreateScenarioRequest.java
package com.lingoguma.detective_backend.scenario.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateScenarioRequest {
    private String title;   // 프론트에서 입력
    private String content; // 프론트에서 입력
    // author는 절대 받지 않음 (서버가 세션에서 식별)
}
