// src/main/java/com/lingoguma/detective_backend/scenario/repository/ScenarioRepository.java
package com.lingoguma.detective_backend.scenario.repository;

import com.lingoguma.detective_backend.scenario.entity.Scenario;
import com.lingoguma.detective_backend.scenario.entity.ScenarioStatus;
import com.lingoguma.detective_backend.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScenarioRepository extends JpaRepository<Scenario, Long> {
    List<Scenario> findByAuthorOrderByCreatedAtDesc(User author);
    List<Scenario> findByStatusOrderBySubmittedAtAsc(ScenarioStatus status);
}
