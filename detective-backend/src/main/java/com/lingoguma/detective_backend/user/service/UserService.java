// src/main/java/com/lingoguma/detective_backend/user/service/UserService.java
package com.lingoguma.detective_backend.user.service;

import com.lingoguma.detective_backend.user.entity.Role;
import com.lingoguma.detective_backend.user.entity.User;
import com.lingoguma.detective_backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;

    /** 세션의 LOGIN_ID 등 문자열 로그인 식별자로 유저 조회 */
    public User getByLoginId(String loginId) {
        if (loginId == null || loginId.isBlank()) {
            throw new IllegalArgumentException("loginId가 비어있습니다.");
        }
        return userRepository.findByLoginId(loginId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 로그인 ID: " + loginId));
    }

    /** PK(index)로 유저 조회 */
    public User getByIndex(Long index) {
        if (index == null) throw new IllegalArgumentException("index가 null 입니다.");
        return userRepository.findById(index)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자(PK): " + index));
    }

    /** 이메일로 유저 조회 */
    public User getByEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("email이 비어있습니다.");
        }
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이메일: " + email));
    }

    /** 중복 체크 */
    public boolean existsByLoginId(String loginId) {
        if (loginId == null || loginId.isBlank()) return false;
        return userRepository.existsByLoginId(loginId);
    }

    public boolean existsByEmail(String email) {
        if (email == null || email.isBlank()) return false;
        return userRepository.existsByEmail(email);
    }

    /**
     * 회원 가입/등록
     * - password는 이미 인코딩되어 들어온다고 가정(보안 정책에 맞게 Controller/Facade에서 인코딩 권장)
     */
    @Transactional
    public User register(String loginId,
                         String email,
                         String encodedPassword,
                         String nickname,
                         Role roleOrNull) {

        if (loginId == null || loginId.isBlank()) throw new IllegalArgumentException("loginId는 필수입니다.");
        if (email == null || email.isBlank())     throw new IllegalArgumentException("email은 필수입니다.");
        if (encodedPassword == null || encodedPassword.isBlank())
            throw new IllegalArgumentException("password는 필수입니다.");
        if (nickname == null || nickname.isBlank()) throw new IllegalArgumentException("nickname은 필수입니다.");

        if (userRepository.existsByLoginId(loginId)) {
            throw new IllegalStateException("이미 사용 중인 로그인 ID입니다: " + loginId);
        }
        if (userRepository.existsByEmail(email)) {
            throw new IllegalStateException("이미 사용 중인 이메일입니다: " + email);
        }

        Role role = (roleOrNull != null) ? roleOrNull : Role.MEMBER;

        User user = User.builder()
                .id(loginId)
                .email(email)
                .password(encodedPassword) // Controller에서 BCrypt 등으로 인코딩하여 전달 권장
                .nickname(nickname)
                .role(role)
                .emailVerified(false)
                .build();

        // createdAt은 @PrePersist에서 자동 세팅
        return userRepository.save(user);
    }

    /** 이메일 인증 토큰 검증/확정 */
    @Transactional
    public void verifyEmail(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("인증 토큰이 비어있습니다.");
        }

        User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 인증 토큰입니다."));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = user.getEmailVerificationExpiresAt();
        if (expiresAt != null && expiresAt.isBefore(now)) {
            throw new IllegalStateException("인증 토큰이 만료되었습니다.");
        }

        user.setEmailVerified(true);
        user.setVerifiedAt(now);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationExpiresAt(null);
        // dirty checking으로 flush
    }

    /** 닉네임 변경 */
    @Transactional
    public void changeNickname(Long userIndex, String newNickname) {
        if (newNickname == null || newNickname.isBlank()) {
            throw new IllegalArgumentException("닉네임이 비어있습니다.");
        }
        User user = getByIndex(userIndex);
        user.setNickname(newNickname);
    }

    /**
     * 비밀번호 변경
     * - newEncodedPassword는 인코딩된 비밀번호라고 가정.
     *   (스프링 시큐리티 사용 시 Controller/Facade에서 PasswordEncoder로 인코딩 후 전달)
     */
    @Transactional
    public void changePassword(Long userIndex, String newEncodedPassword) {
        if (newEncodedPassword == null || newEncodedPassword.isBlank()) {
            throw new IllegalArgumentException("비밀번호가 비어있습니다.");
        }
        User user = getByIndex(userIndex);
        user.setPassword(newEncodedPassword);
    }

    /** 임시: 존재하지 않으면 생성(테스트/부트스트랩 용도) */
    @Transactional
    public User getOrCreate(String loginId,
                            String email,
                            String encodedPassword,
                            String nickname,
                            Role roleOrNull) {
        return userRepository.findByLoginId(loginId).orElseGet(() ->
                register(loginId, email, encodedPassword, nickname, roleOrNull)
        );
    }
}
