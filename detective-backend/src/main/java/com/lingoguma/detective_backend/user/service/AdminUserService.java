// src/main/java/com/lingoguma/detective_backend/user/service/AdminUserService.java
package com.lingoguma.detective_backend.user.service;

import com.lingoguma.detective_backend.scenario.repository.ScenarioRepository;
import com.lingoguma.detective_backend.user.dto.UpdateUserRoleRequest;
import com.lingoguma.detective_backend.user.entity.Role;
import com.lingoguma.detective_backend.user.entity.User;
import com.lingoguma.detective_backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminUserService {

    private final UserRepository userRepository;
    private final ScenarioRepository scenarioRepository;

    public List<User> listUsers(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return userRepository.findAll();
        }
        return userRepository
                .findByNicknameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrIdContainingIgnoreCase(
                        keyword, keyword, keyword
                );
    }

    @Transactional
    public User updateRole(Long targetIndex, User actingAdmin, UpdateUserRoleRequest req) {
        if (req.getRole() == null) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "role은 필수입니다.");
        }
        User target = userRepository.findById(targetIndex)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        // 자기 자신 ADMIN 해제 방지
        if (actingAdmin.getIndex().equals(target.getIndex()) && req.getRole() != Role.ADMIN) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.CONFLICT, "자기 자신의 ADMIN 권한을 해제할 수 없습니다.");
        }

        // 마지막 ADMIN 보호
        if (target.getRole() == Role.ADMIN && req.getRole() != Role.ADMIN) {
            long adminCount = userRepository.countByRole(Role.ADMIN);
            if (adminCount <= 1) {
                throw new org.springframework.web.server.ResponseStatusException(HttpStatus.CONFLICT, "마지막 ADMIN은 강등할 수 없습니다.");
            }
        }

        target.setRole(req.getRole());
        return target; // dirty checking
    }

    @Transactional
    public void deleteUser(Long targetIndex, User actingAdmin) {
        User target = userRepository.findById(targetIndex)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));

        // 자기 자신 삭제 금지
        if (actingAdmin.getIndex().equals(target.getIndex())) {
            throw new org.springframework.web.server.ResponseStatusException(HttpStatus.CONFLICT, "자기 자신은 삭제할 수 없습니다.");
        }

        // 마지막 ADMIN 보호
        if (target.getRole() == Role.ADMIN) {
            long adminCount = userRepository.countByRole(Role.ADMIN);
            if (adminCount <= 1) {
                throw new org.springframework.web.server.ResponseStatusException(HttpStatus.CONFLICT, "마지막 ADMIN은 삭제할 수 없습니다.");
            }
        }

        // 작성 시나리오 보유 시 삭제 금지
        long owned = scenarioRepository.countByAuthor(target);
        if (owned > 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.CONFLICT, "해당 사용자가 작성한 시나리오가 있어 삭제할 수 없습니다."
            );
        }

        userRepository.delete(target);
    }
}
