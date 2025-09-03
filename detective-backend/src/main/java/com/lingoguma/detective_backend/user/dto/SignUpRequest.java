package com.lingoguma.detective_backend.user.dto;

import jakarta.validation.constraints.Email;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SignUpRequest {
    private String userId;

    @Email
    private String email;
    
    private String password;
    private String nickname;
}
