// src/main/java/com/lingoguma/detective_backend/scenario/dto/ModerationRequest.java
package com.lingoguma.detective_backend.scenario.dto;

import lombok.Getter;
import lombok.Setter;

/** 관리자 반려 사유 등의 간단한 입력용 DTO */
@Getter @Setter
public class ModerationRequest {
    private String reason; // 선택값
}
