// src/main/java/com/lingoguma/detective_backend/scenario/controller/ScenarioController.java
package com.lingoguma.detective_backend.scenario.controller;

import com.lingoguma.detective_backend.scenario.dto.CreateScenarioRequest;
import com.lingoguma.detective_backend.scenario.dto.ScenarioResponse;
import com.lingoguma.detective_backend.scenario.dto.UpdateScenarioRequest;
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
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/scenarios")
public class ScenarioController {

    private final ScenarioService scenarioService;
    private final UserService userService;

    /** 세션 → User 로 변환 (userIndex 우선, 없으면 LOGIN_ID) */
    private User currentUser(HttpSession session) {
        Long userIndex = (Long) session.getAttribute("userIndex");
        String loginId  = (String) session.getAttribute("LOGIN_ID");
        if (userIndex == null && (loginId == null || loginId.isBlank())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return (userIndex != null) ? userService.getByIndex(userIndex) : userService.getByLoginId(loginId);
    }

    /** 초안 생성(제출) */
    @PostMapping
    public ResponseEntity<ScenarioResponse> create(@RequestBody CreateScenarioRequest req, HttpSession session) {
        User me = currentUser(session);
        Scenario created = scenarioService.create(req, me);
        return ResponseEntity.ok(ScenarioResponse.from(created));
    }

    /** 내 초안 목록 */
    @GetMapping("/me")
    public ResponseEntity<List<ScenarioResponse>> myScenarios(HttpSession session) {
        User me = currentUser(session);
        List<ScenarioResponse> results = scenarioService.findMine(me)
                .stream().map(ScenarioResponse::from).toList();
        return ResponseEntity.ok(results);
    }

    /** 내 시나리오 단건 조회 */
    @GetMapping("/{id}")
    public ResponseEntity<ScenarioResponse> getOne(@PathVariable Long id, HttpSession session) {
        User me = currentUser(session);
        Scenario s = scenarioService.getOwned(id, me);
        return ResponseEntity.ok(ScenarioResponse.from(s));
    }

    /** (REJECTED일 때만) 내 시나리오 수정 */
    @PutMapping("/{id}")
    public ResponseEntity<ScenarioResponse> update(
            @PathVariable Long id,
            @RequestBody UpdateScenarioRequest req,
            HttpSession session
    ) {
        User me = currentUser(session);
        Scenario s = scenarioService.updateIfRejected(id, me, req);
        return ResponseEntity.ok(ScenarioResponse.from(s));
    }

    // ✅ 공개(등록됨) 목록: [{id, title}]
    @GetMapping("/public")
    public ResponseEntity<?> listPublic() {
        return ResponseEntity.ok(scenarioService.listPublishedBrief());
    }

    /** (REJECTED일 때만) 내 시나리오 삭제 */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, HttpSession session) {
        User me = currentUser(session);
        scenarioService.deleteIfRejected(id, me);
        return ResponseEntity.ok(Map.of("message", "삭제 완료"));
    }
}
