// src/main/java/com/lingoguma/detective_backend/scenario/controller/AdminScenarioController.java
package com.lingoguma.detective_backend.scenario.controller;

import com.lingoguma.detective_backend.scenario.dto.ModerationRequest;
import com.lingoguma.detective_backend.scenario.dto.ScenarioResponse;
import com.lingoguma.detective_backend.scenario.service.ScenarioService;
import com.lingoguma.detective_backend.user.entity.User;
import com.lingoguma.detective_backend.user.service.UserService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/scenarios")
@RequiredArgsConstructor
public class AdminScenarioController {

    private final ScenarioService scenarioService;
    private final UserService userService;

    /** 세션에서 ADMIN 검증 + User 재조회 */
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

    /** 제출됨 목록 */
    @GetMapping("/submitted")
    public ResponseEntity<List<ScenarioResponse>> submitted(HttpSession session) {
        requireAdmin(session);
        return ResponseEntity.ok(scenarioService.listSubmitted());
    }

    /** 승인 */
    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id, HttpSession session) {
        User admin = requireAdmin(session);
        scenarioService.approve(id, admin);
        return ResponseEntity.ok(Map.of("message", "승인 완료"));
    }

    /** 반려 */
    @PostMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id, @RequestBody ModerationRequest req, HttpSession session) {
        User admin = requireAdmin(session);
        scenarioService.reject(id, req, admin);
        return ResponseEntity.ok(Map.of("message", "반려 처리"));
    }
}
