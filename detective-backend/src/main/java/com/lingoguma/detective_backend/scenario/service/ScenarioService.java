// src/main/java/com/lingoguma/detective_backend/scenario/service/ScenarioService.java
package com.lingoguma.detective_backend.scenario.service;

import com.lingoguma.detective_backend.scenario.dto.CreateScenarioRequest;
import com.lingoguma.detective_backend.scenario.dto.ModerationRequest;
import com.lingoguma.detective_backend.scenario.dto.ScenarioResponse;
import com.lingoguma.detective_backend.scenario.entity.Scenario;
import com.lingoguma.detective_backend.scenario.entity.ScenarioStatus;
import com.lingoguma.detective_backend.scenario.repository.ScenarioRepository;
import com.lingoguma.detective_backend.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScenarioService {

    private final ScenarioRepository scenarioRepository;

    /** 초안 생성(제출) */
    @Transactional
    public Scenario create(CreateScenarioRequest req, User author) {
        Scenario s = Scenario.builder()
                .title(req.getTitle())
                .content(req.getContent())
                .status(ScenarioStatus.SUBMITTED) // 최초 상태 정책
                .author(author)
                .submittedAt(LocalDateTime.now())
                .build();
        return scenarioRepository.save(s);
    }

    /** 내 초안 목록 */
    @Transactional(readOnly = true)
    public List<Scenario> findMine(User author) {
        return scenarioRepository.findByAuthorOrderByCreatedAtDesc(author);
    }

    /** 제출됨 목록(관리자용) */
    @Transactional(readOnly = true)
    public List<ScenarioResponse> listSubmitted() {
        return scenarioRepository.findByStatusOrderBySubmittedAtAsc(ScenarioStatus.SUBMITTED)
                .stream().map(ScenarioResponse::from).toList();
    }

    /** 승인(관리자) */
    @Transactional
    public void approve(Long scenarioId, User admin) {
        Scenario s = scenarioRepository.findById(scenarioId)
                .orElseThrow(() -> new IllegalArgumentException("시나리오가 없습니다: " + scenarioId));
        if (s.getStatus() != ScenarioStatus.SUBMITTED) {
            throw new IllegalStateException("SUBMITTED 상태만 승인할 수 있습니다.");
        }
        s.setStatus(ScenarioStatus.APPROVED);
        // 필요하면 승인자/승인시각 컬럼을 추가해 기록
    }

    /** 반려(관리자) */
    @Transactional
    public void reject(Long scenarioId, ModerationRequest req, User admin) {
        Scenario s = scenarioRepository.findById(scenarioId)
                .orElseThrow(() -> new IllegalArgumentException("시나리오가 없습니다: " + scenarioId));
        if (s.getStatus() != ScenarioStatus.SUBMITTED) {
            throw new IllegalStateException("SUBMITTED 상태만 반려할 수 있습니다.");
        }
        s.setStatus(ScenarioStatus.REJECTED);
        // 필요하면 반려사유/담당자/시각 컬럼을 추가해 기록 (req.getReason())
    }
}
