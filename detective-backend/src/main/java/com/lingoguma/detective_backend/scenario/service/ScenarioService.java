// src/main/java/com/lingoguma/detective_backend/scenario/service/ScenarioService.java
package com.lingoguma.detective_backend.scenario.service;

import com.lingoguma.detective_backend.scenario.dto.CreateScenarioRequest;
import com.lingoguma.detective_backend.scenario.dto.ModerationRequest;
import com.lingoguma.detective_backend.scenario.dto.ScenarioResponse;
import com.lingoguma.detective_backend.scenario.dto.UpdateScenarioRequest;
import com.lingoguma.detective_backend.scenario.entity.Scenario;
import com.lingoguma.detective_backend.scenario.entity.ScenarioStatus;
import com.lingoguma.detective_backend.scenario.repository.ScenarioRepository;
import com.lingoguma.detective_backend.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
                .status(ScenarioStatus.SUBMITTED)
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

    /** 단건 조회: 본인 소유 검증 */
    @Transactional(readOnly = true)
    public Scenario getOwned(Long scenarioId, User me) {
        Scenario s = scenarioRepository.findById(scenarioId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "시나리오가 없습니다."));
        if (!s.getAuthor().getIndex().equals(me.getIndex())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.FORBIDDEN, "본인 소유가 아닙니다.");
        }
        return s;
    }

    /** (REJECTED 또는 SUBMITTED일 때만) 수정 */
    @Transactional
    public Scenario updateIfRejected(Long scenarioId, User me, UpdateScenarioRequest req) {
        Scenario s = getOwned(scenarioId, me);
        if (!(s.getStatus() == ScenarioStatus.REJECTED || s.getStatus() == ScenarioStatus.SUBMITTED)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.CONFLICT, "REJECTED 또는 SUBMITTED 상태에서만 수정할 수 있습니다."
            );
        }
        if (req.getTitle() == null || req.getTitle().isBlank()
                || req.getContent() == null || req.getContent().isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "제목/내용은 비어 있을 수 없습니다.");
        }
        s.setTitle(req.getTitle());
        s.setContent(req.getContent());
        return s; // dirty checking
    }

    /** (REJECTED 또는 SUBMITTED일 때만) 삭제 */
    @Transactional
    public void deleteIfRejected(Long scenarioId, User me) {
        Scenario s = getOwned(scenarioId, me);
        if (!(s.getStatus() == ScenarioStatus.REJECTED || s.getStatus() == ScenarioStatus.SUBMITTED)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.CONFLICT, "REJECTED 또는 SUBMITTED 상태에서만 삭제할 수 있습니다."
            );
        }
        scenarioRepository.delete(s);
    }

    /** 관리자: 제출됨 목록 */
    @Transactional(readOnly = true)
    public List<ScenarioResponse> listSubmitted() {
        return scenarioRepository.findByStatusOrderBySubmittedAtAsc(ScenarioStatus.SUBMITTED)
                .stream().map(ScenarioResponse::from).toList();
    }

    /** 관리자: 승인 */
    @Transactional
    public void approve(Long scenarioId, User admin) {
        Scenario s = scenarioRepository.findById(scenarioId)
                .orElseThrow(() -> new IllegalArgumentException("시나리오가 없습니다: " + scenarioId));
        if (s.getStatus() != ScenarioStatus.SUBMITTED) {
            throw new IllegalStateException("SUBMITTED 상태만 승인할 수 있습니다.");
        }
        s.setStatus(ScenarioStatus.APPROVED);
    }

    /** 관리자: 반려 */
    @Transactional
    public void reject(Long scenarioId, ModerationRequest req, User admin) {
        Scenario s = scenarioRepository.findById(scenarioId)
                .orElseThrow(() -> new IllegalArgumentException("시나리오가 없습니다: " + scenarioId));
        if (s.getStatus() != ScenarioStatus.SUBMITTED) {
            throw new IllegalStateException("SUBMITTED 상태만 반려할 수 있습니다.");
        }
        s.setStatus(ScenarioStatus.REJECTED);
        // 필요 시 반려 사유 기록
    }
}
