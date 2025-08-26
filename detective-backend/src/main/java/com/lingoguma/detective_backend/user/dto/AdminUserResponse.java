package com.lingoguma.detective_backend.user.dto;

import com.lingoguma.detective_backend.user.entity.Role;
import com.lingoguma.detective_backend.user.entity.User;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AdminUserResponse {
    private Long index;
    private String id;
    private String email;
    private String nickname;
    private Role role;
    private boolean emailVerified;
    private LocalDateTime createdAt;

    public static AdminUserResponse from(User u) {
        return AdminUserResponse.builder()
                .index(u.getIndex())
                .id(u.getId())
                .email(u.getEmail())
                .nickname(u.getNickname())
                .role(u.getRole())
                .emailVerified(u.isEmailVerified())
                .createdAt(u.getCreatedAt())
                .build();
    }
}