// src/main/java/com/lingoguma/detective_backend/scenario/dto/UpdateScenarioRequest.java
package com.lingoguma.detective_backend.scenario.dto;

import lombok.Getter; import lombok.Setter;

@Getter @Setter
public class UpdateScenarioRequest {
    private String title;
    private String summary;
    private String content;
}
