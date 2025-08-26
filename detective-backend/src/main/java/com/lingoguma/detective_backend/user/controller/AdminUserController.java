package com.lingoguma.detective_backend.user.controller;

import com.lingoguma.detective_backend.user.dto.RoleUpdateRequest;
import com.lingoguma.detective_backend.user.entity.User;
import com.lingoguma.detective_backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepository;

    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{index}/role")
    public ResponseEntity<?> updateRole(@PathVariable Long index, @RequestBody RoleUpdateRequest req) {
        User u = userRepository.findById(index)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자"));
        u.setRole(req.getRole());
        userRepository.save(u);
        return ResponseEntity.ok().build();
    }
}