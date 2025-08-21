package com.lingoguma.detective_backend.user.repository;

import com.lingoguma.detective_backend.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * User 저장/조회 Repository
 * PK: Long (엔티티 필드명: index)
 * 로그인 식별자: String (엔티티 필드명: id)  ← 기존 email을 id로 변경
 *
 * 주의: JpaRepository 기본 메서드 findById(ID) 는 PK(Long)용이므로,
 *      로그인 식별자(String) 조회는 이름 충돌을 피하기 위해 JPQL 메서드로 별도 정의한다.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    @Query("SELECT u FROM User u WHERE u.id = :loginId")
    Optional<User> findByLoginId(@Param("loginId") String loginId);

    @Query("SELECT (COUNT(u) > 0) FROM User u WHERE u.id = :loginId")
    boolean existsByLoginId(@Param("loginId") String loginId);

    Optional<User> findByEmail(String email);         // 이메일 중복/조회
    boolean existsByEmail(String email);

    Optional<User> findByEmailVerificationToken(String token);
}

