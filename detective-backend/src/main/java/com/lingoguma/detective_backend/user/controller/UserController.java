// src/main/java/com/lingoguma/detective_backend/user/controller/UserController.java
package com.lingoguma.detective_backend.user.controller;

import com.lingoguma.detective_backend.user.service.email.*;
import com.lingoguma.detective_backend.user.dto.LoginRequest;
import com.lingoguma.detective_backend.user.dto.SignUpRequest;
import com.lingoguma.detective_backend.user.entity.Role;
import com.lingoguma.detective_backend.user.entity.User;
import com.lingoguma.detective_backend.user.repository.UserRepository;
import com.lingoguma.detective_backend.user.service.UserService;
import com.lingoguma.detective_backend.user.service.email.EmailSender;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender EmailSender;

    // 인증 링크를 백엔드로 보낼지(간단) 프론트로 보낼지 선택
    // 여기선 백엔드 링크로 보냄: http://localhost:8087/api/users/verify-email?token=...
    @Value("${app.backendBaseUrl:http://localhost:8087}")
    private String backendBaseUrl;

    // -------------------------
    // 회원가입 (항상 MEMBER)
    // -------------------------
    @PostMapping("/signup")
    public ResponseEntity<?> signUp(@RequestBody SignUpRequest request) {
        if (request.getId() == null || request.getId().isBlank()
                || request.getEmail() == null || request.getEmail().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()
                || request.getNickname() == null || request.getNickname().isBlank()) {
            return ResponseEntity.badRequest().body("필수 항목(id, email, password, nickname)이 누락되었습니다.");
        }

        String encoded = passwordEncoder.encode(request.getPassword());
        User created = userService.register(
                request.getId(),
                request.getEmail(),
                encoded,
                request.getNickname(),
                Role.MEMBER
        );

        // ✅ 토큰 생성/저장
        String token = UUID.randomUUID().toString();
        created.setEmailVerificationToken(token);
        created.setEmailVerificationExpiresAt(LocalDateTime.now().plusHours(24));
        userRepository.save(created);

        // ✅ 인증 링크 생성 + 발송(개발용 콘솔 출력)
        String verifyUrl = backendBaseUrl + "/api/users/verify-email?token=" + token;
        String mailBody = "안녕하세요.\n아래 링크를 눌러 이메일 인증을 완료하세요:\n" + verifyUrl + "\n(24시간 유효)";
        EmailSender.send(created.getEmail(), "[Detective] 이메일 인증", mailBody);

        // 개발 편의: 응답에도 링크를 넣어주면 프론트에서 바로 사용 가능
        return ResponseEntity.ok(Map.of(
                "message", "회원가입 성공! 이메일을 확인하고 인증을 완료하세요.",
                "index", created.getIndex(),
                "id", created.getId(),
                "email", created.getEmail(),
                "devVerifyUrl", verifyUrl  // 운영에서 제거 가능
        ));
    }

    // -------------------------
    // 이메일 인증
    // -------------------------
    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token) {
        userService.verifyEmail(token);
        return ResponseEntity.ok("이메일 인증이 완료되었습니다. 이제 로그인할 수 있습니다.");
    }

    // -------------------------
    // 인증 메일 재발송
    // -------------------------
    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestParam("email") String email) {
        User user = userService.getByEmail(email);
        if (user.isEmailVerified()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("이미 인증된 이메일입니다.");
        }
        String token = UUID.randomUUID().toString();
        user.setEmailVerificationToken(token);
        user.setEmailVerificationExpiresAt(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        String verifyUrl = backendBaseUrl + "/api/users/verify-email?token=" + token;
        String mailBody = "이메일 인증 링크 재발송:\n" + verifyUrl + "\n(24시간 유효)";
        EmailSender.send(user.getEmail(), "[Detective] 이메일 인증 재발송", mailBody);

        return ResponseEntity.ok(Map.of(
                "message", "인증 메일을 재발송했습니다.",
                "devVerifyUrl", verifyUrl // 운영에서 제거 가능
        ));
    }

    // -------------------------
    // 로그인 (세션 저장)
    // -------------------------
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpSession session) {
        if (request.getId() == null || request.getId().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body("id와 password는 필수입니다.");
        }

        User user = userService.getByLoginId(request.getId());
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        // ✅ A안 유지: 미인증이면 403
        if (!user.isEmailVerified()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("이메일 인증이 필요합니다.");
        }

        session.setAttribute("userIndex", user.getIndex());
        session.setAttribute("LOGIN_ID", user.getId());
        session.setAttribute("ROLE", user.getRole().name());

        return ResponseEntity.ok(Map.of(
                "index", user.getIndex(),
                "id", user.getId(),
                "nickname", user.getNickname(),
                "role", user.getRole().name(),
                "email", user.getEmail()
        ));
    }

    // -------------------------
    // 내 정보
    // -------------------------
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        Long userIndex = (Long) session.getAttribute("userIndex");
        String loginId = (String) session.getAttribute("LOGIN_ID");

        User fresh = null;
        if (userIndex != null) fresh = userRepository.findById(userIndex).orElse(null);
        else if (loginId != null) fresh = userRepository.findByLoginId(loginId).orElse(null);

        if (fresh == null) {
            session.invalidate();
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        return ResponseEntity.ok(Map.of(
                "index", fresh.getIndex(),
                "id", fresh.getId(),
                "nickname", fresh.getNickname(),
                "role", fresh.getRole().name(),
                "email", fresh.getEmail()
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok("로그아웃 되었습니다.");
    }
}
