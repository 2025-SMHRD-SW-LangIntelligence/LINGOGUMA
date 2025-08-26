// src/main/java/com/lingoguma/detective_backend/user/controller/AdminUserController.java
package com.lingoguma.detective_backend.user.controller;

import com.lingoguma.detective_backend.user.dto.AdminUserResponse;
import com.lingoguma.detective_backend.user.dto.RoleUpdateRequest;       // ✅ 기존 DTO 유지
import com.lingoguma.detective_backend.user.dto.UpdateUserRoleRequest;  // ✅ 신규 DTO (아래 참고)
import com.lingoguma.detective_backend.user.entity.User;
import com.lingoguma.detective_backend.user.service.AdminUserService;
import com.lingoguma.detective_backend.user.service.UserService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;
    private final UserService userService;

    /** 세션 기반 ADMIN 보장 (SecurityContext 미연동이어도 동작) */
    private User requireAdmin(HttpSession session) {
        String role = (String) session.getAttribute("ROLE");
        if (role == null) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        if (!"ADMIN".equals(role)) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 접근 가능");
        }
        Long userIndex = (Long) session.getAttribute("userIndex");
        String loginId  = (String) session.getAttribute("LOGIN_ID");
        if (userIndex != null) return userService.getByIndex(userIndex);
        if (loginId != null && !loginId.isBlank()) return userService.getByLoginId(loginId);
        throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "세션이 유효하지 않습니다.");
    }

    /** 🔹 사용자 목록 (검색어 q 옵션) */
    @PreAuthorize("hasRole('ADMIN')") // SecurityContext 쓰는 경우
    @GetMapping
    public ResponseEntity<List<AdminUserResponse>> list(@RequestParam(required = false) String q,
                                                        HttpSession session) {
        requireAdmin(session); // SecurityContext 미사용 환경에서도 보호
        List<AdminUserResponse> list = adminUserService.listUsers(q).stream()
                .map(AdminUserResponse::from).toList();
        return ResponseEntity.ok(list);
    }

    /** 🔹 (기존) 역할 변경 - PATCH + RoleUpdateRequest 유지 (하위호환) */
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/{index}/role")
    public ResponseEntity<AdminUserResponse> updateRolePatch(@PathVariable Long index,
                                                             @RequestBody RoleUpdateRequest req,
                                                             HttpSession session) {
        User admin = requireAdmin(session);
        // RoleUpdateRequest 가 role 필드만 가지는 기존 DTO라고 가정
        var updated = adminUserService.updateRole(index, admin, toUpdateUserRoleRequest(req));
        return ResponseEntity.ok(AdminUserResponse.from(updated));
    }

    /** 🔹 (신규) 역할 변경 - PUT + UpdateUserRoleRequest */
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{index}/role")
    public ResponseEntity<AdminUserResponse> updateRolePut(@PathVariable Long index,
                                                           @RequestBody UpdateUserRoleRequest req,
                                                           HttpSession session) {
        User admin = requireAdmin(session);
        var updated = adminUserService.updateRole(index, admin, req);
        return ResponseEntity.ok(AdminUserResponse.from(updated));
    }

    /** 🔹 사용자 삭제 */
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{index}")
    public ResponseEntity<?> delete(@PathVariable Long index, HttpSession session) {
        User admin = requireAdmin(session);
        adminUserService.deleteUser(index, admin);
        return ResponseEntity.ok(Map.of("message", "삭제 완료"));
    }

    // ---- helper ----
    private UpdateUserRoleRequest toUpdateUserRoleRequest(RoleUpdateRequest req) {
        UpdateUserRoleRequest u = new UpdateUserRoleRequest();
        u.setRole(req.getRole());
        return u;
    }
}
