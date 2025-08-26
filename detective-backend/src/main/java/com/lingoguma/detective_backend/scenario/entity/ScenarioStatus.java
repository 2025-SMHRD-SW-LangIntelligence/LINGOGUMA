package com.lingoguma.detective_backend.scenario.entity;

public enum ScenarioStatus {
    DRAFT,        // 작성 중
    SUBMITTED,    // 검토 요청됨
    REVIEWING,    // 검토 중
    APPROVED,     // 승인됨
    REJECTED,     // 반려됨
}