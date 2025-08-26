package com.lingoguma.detective_backend.scenario.entity;

public enum ScenarioStatus {
    DRAFT,        // 작성 중
    SUBMITTED,    // 검토 요청됨
    APPROVED,     // 승인됨
    REJECTED,     // 반려됨
    PUBLISHED     // (선택) 발행됨
}