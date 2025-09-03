package com.lingoguma.detective_backend.game.dto;

import lombok.Data;

@Data
public class NlpAskRequest {
    private Integer sessionId;
    private String suspectName;
    private String userText;
}
