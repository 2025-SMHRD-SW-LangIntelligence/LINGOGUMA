package com.lingoguma.detective_backend.user.dto;

import com.lingoguma.detective_backend.user.entity.Role;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UpdateUserRoleRequest {
    private Role role; // MEMBER / EXPERT / ADMIN
}
