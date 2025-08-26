// src/main/java/com/lingoguma/detective_backend/user/dto/SignUpRequest.java
package com.lingoguma.detective_backend.user.dto;

import com.lingoguma.detective_backend.user.entity.Role;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class SignUpRequest {
    private String id;
    private String email;
    private String password;
    private String nickname;
    private Role role; // ← 선택 입력, 없으면 컨트롤러에서 MEMBER로 처리
}
