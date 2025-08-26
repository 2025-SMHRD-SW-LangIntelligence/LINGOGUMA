// src/main/java/com/lingoguma/detective_backend/scenario/controller/ScenarioController.java
package com.lingoguma.detective_backend.scenario.controller;

import com.lingoguma.detective_backend.scenario.dto.CreateScenarioRequest;
import com.lingoguma.detective_backend.scenario.dto.ScenarioResponse;
import com.lingoguma.detective_backend.scenario.entity.Scenario;
import com.lingoguma.detective_backend.scenario.service.ScenarioService;
import com.lingoguma.detective_backend.user.entity.User;
import com.lingoguma.detective_backend.user.service.UserService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/scenarios")
public class ScenarioController {

    private final ScenarioService scenarioService;
    private final UserService userService;

    /** 초안 생성(제출): 세션 값 → User 엔티티 재조회 (캐스팅 금지) */
    @PostMapping
    public ResponseEntity<ScenarioResponse> create(@RequestBody CreateScenarioRequest req, HttpSession session) {
        Long userIndex = (Long) session.getAttribute("userIndex");
        String loginId  = (String) session.getAttribute("LOGIN_ID");
        if (userIndex == null && (loginId == null || loginId.isBlank())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User me = (userIndex != null) ? userService.getByIndex(userIndex) : userService.getByLoginId(loginId);
        Scenario created = scenarioService.create(req, me);
        return ResponseEntity.ok(ScenarioResponse.from(created));
    }

    /** 내 초안 목록 */
    @GetMapping("/me")
    public ResponseEntity<List<ScenarioResponse>> myScenarios(HttpSession session) {
        Long userIndex = (Long) session.getAttribute("userIndex");
        String loginId  = (String) session.getAttribute("LOGIN_ID");
        if (userIndex == null && (loginId == null || loginId.isBlank())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User me = (userIndex != null) ? userService.getByIndex(userIndex) : userService.getByLoginId(loginId);
        List<ScenarioResponse> results = scenarioService.findMine(me).stream().map(ScenarioResponse::from).toList();
        return ResponseEntity.ok(results);
    }
}
