// src/main/java/com/lingoguma/detective_backend/scenario/repository/ScenarioRepository.java
package com.lingoguma.detective_backend.scenario.repository;

import com.lingoguma.detective_backend.scenario.entity.Scenario;
import com.lingoguma.detective_backend.scenario.entity.ScenarioStatus;
import com.lingoguma.detective_backend.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ScenarioRepository extends JpaRepository<Scenario, Long> {

    // 작가 본인 목록
    List<Scenario> findByAuthorOrderByCreatedAtDesc(User author);

    // 제출됨 목록(관리자)
    List<Scenario> findByStatusOrderBySubmittedAtAsc(ScenarioStatus status);

    // 🔽 전체 관리용
    List<Scenario> findAllByOrderByCreatedAtDesc();
    List<Scenario> findByStatusOrderByCreatedAtDesc(ScenarioStatus status);

    // ✅ 관리자 검색(부분 일치, 최신수정순)
    List<Scenario> findByStatusAndTitleContainingIgnoreCaseOrderByUpdatedAtDesc(ScenarioStatus status, String keyword);
    
    @Query("""
           select s from Scenario s
           join s.author a
           where lower(s.title) like lower(concat('%', :q, '%'))
              or lower(a.id) like lower(concat('%', :q, '%'))
              or lower(a.email) like lower(concat('%', :q, '%'))
              or lower(a.nickname) like lower(concat('%', :q, '%'))
           order by s.createdAt desc
           """)
    List<Scenario> searchAll(@Param("q") String q);

    @Query("""
           select s from Scenario s
           join s.author a
           where s.status = :status
             and (
                  lower(s.title) like lower(concat('%', :q, '%'))
               or lower(a.id) like lower(concat('%', :q, '%'))
               or lower(a.email) like lower(concat('%', :q, '%'))
               or lower(a.nickname) like lower(concat('%', :q, '%'))
             )
           order by s.createdAt desc
           """)
    List<Scenario> searchByStatus(@Param("status") ScenarioStatus status, @Param("q") String q);

    // 유저 삭제 제약 확인용
    long countByAuthor(User author);
}
