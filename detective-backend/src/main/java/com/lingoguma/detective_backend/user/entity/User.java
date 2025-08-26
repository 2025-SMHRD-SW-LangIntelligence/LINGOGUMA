package com.lingoguma.detective_backend.user.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
@Table(name = "`user`") // 테이블명이 user면 백틱 권장
@ToString(exclude = {"password", "emailVerificationToken"})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_index")             // PK 컬럼명
    private Long index;                      // PK(Long)

    @Column(name = "id", nullable = false, unique = true, length = 100)
    private String id;                       // 로그인 아이디(문자열, 기존 email 대체)

    @Column(name = "email", nullable = false, unique = true, length = 320)
    private String email;                    // 이메일(인증 대상)

    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false, length = 50)
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role = Role.MEMBER;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;           // 기본 false

    @Column(name = "email_verification_token", length = 64)
    private String emailVerificationToken;

    @Column(name = "email_verification_expires_at")
    private LocalDateTime emailVerificationExpiresAt;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (role == null) role = Role.MEMBER;
        // // 신규 유저 기본값
        // if (!this.emailVerified) this.emailVerified = false;
    }
}
