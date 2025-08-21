package com.lingoguma.detective_backend.user.service;

import com.lingoguma.detective_backend.user.dto.SignUpRequest;
import com.lingoguma.detective_backend.user.entity.User;
import com.lingoguma.detective_backend.user.entity.Role;
import com.lingoguma.detective_backend.user.repository.UserRepository;
import com.lingoguma.detective_backend.user.service.email.EmailSender;

import lombok.RequiredArgsConstructor;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Duration TOKEN_TTL = Duration.ofHours(24);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;

    @Value("${app.mail.verification-url}")
    private String verificationUrl; // e.g. https://your-domain.com/api/users/verify-email

    /** 회원가입: 저장 + 이메일 인증 메일 발송 */
    public Long signUp(SignUpRequest request) {
        // 유효성
        requireText(request.getId(), "ID(로그인 아이디)를 입력해주세요.");
        requireText(request.getEmail(), "이메일을 입력해주세요.");
        requireText(request.getPassword(), "비밀번호를 입력해주세요.");
        requireText(request.getNickname(), "닉네임을 입력해주세요.");

        // 중복
        if (userRepository.existsByLoginId(request.getId())) {
            throw new IllegalStateException("이미 사용 중인 ID입니다.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalStateException("이미 사용 중인 이메일입니다.");
        }

        // 토큰
        String token = UUID.randomUUID().toString().replace("-", "");
        LocalDateTime expiresAt = LocalDateTime.now().plus(TOKEN_TTL);

        User user = User.builder()
                .id(request.getId())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
                .role(Role.MEMBER)
                .emailVerified(false)
                .emailVerificationToken(token)
                .emailVerificationExpiresAt(expiresAt)
                .build();

        Long index = userRepository.save(user).getIndex();

        // 인증 메일
        String link = verificationUrl + "?token=" + token;
        String subject = "[링고구마] 이메일 인증을 완료해주세요";
        String body = """
            <p>안녕하세요, %s 님.</p>
            <p>아래 링크를 클릭해 이메일 인증을 완료해주세요.</p>
            <p><a href="%s">이메일 인증하기</a></p>
            <p>유효기간: 24시간</p>
            """.formatted(user.getNickname(), link);

        emailSender.send(user.getEmail(), subject, body);

        return index;
    }

    /** 이메일 인증 처리 */
    public void verifyEmail(String token) {
        requireText(token, "유효하지 않은 토큰입니다.");

        User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 토큰입니다."));

        if (user.getEmailVerificationExpiresAt() == null ||
            user.getEmailVerificationExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("인증 토큰이 만료되었습니다. 다시 요청해주세요.");
        }

        user.setEmailVerified(true);
        user.setVerifiedAt(LocalDateTime.now());
        user.setEmailVerificationToken(null);
        user.setEmailVerificationExpiresAt(null);
        userRepository.save(user);
    }

    /** 인증 메일 재발송 */
    public void resendVerification(String email) {
        requireText(email, "이메일을 입력해주세요.");

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("해당 이메일의 사용자가 없습니다."));

        if (user.isEmailVerified()) return; // 이미 인증 완료

        String token = UUID.randomUUID().toString().replace("-", "");
        LocalDateTime expiresAt = LocalDateTime.now().plus(TOKEN_TTL);

        user.setEmailVerificationToken(token);
        user.setEmailVerificationExpiresAt(expiresAt);
        userRepository.save(user);

        String link = verificationUrl + "?token=" + token;
        String subject = "[링고구마] 이메일 인증 재발송";
        String body = """
            <p>아래 링크를 클릭해 이메일 인증을 완료해주세요.</p>
            <p><a href="%s">이메일 인증하기</a></p>
            <p>유효기간: 24시간</p>
            """.formatted(link);

        emailSender.send(user.getEmail(), subject, body);
    }

    /** 로그인 (이메일 인증 여부 확인) */
    public User login(String id, String password) {
        requireText(id, "ID(로그인 아이디)를 입력해주세요.");
        requireText(password, "비밀번호를 입력해주세요.");

        User user = userRepository.findByLoginId(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 ID가 존재하지 않습니다."));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }
        if (!user.isEmailVerified()) {
            throw new IllegalStateException("이메일 인증 후 로그인할 수 있습니다.");
        }

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(user, null, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        return user;
    }

    // ----- util -----
    private void requireText(String v, String msg) {
        if (!StringUtils.hasText(v)) throw new IllegalArgumentException(msg);
    }
}
