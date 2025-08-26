package com.lingoguma.detective_backend.user.controller;

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
import org.springframework.web.util.UriComponentsBuilder;

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

    // ✅ 필드명 컨벤션 정리 (스프링 주입 동일)
    private final EmailSender emailSender;

    // 메일 버튼이 눌리면 이동할 백엔드 인증 URL 베이스
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

        // 토큰 생성/저장
        String token = UUID.randomUUID().toString();
        created.setEmailVerificationToken(token);
        created.setEmailVerificationExpiresAt(LocalDateTime.now().plusHours(24));
        userRepository.save(created);

        // 인증 URL (예: http://localhost:8087/api/users/verify-email?token=...)
        String verifyUrl = UriComponentsBuilder
                .fromHttpUrl(backendBaseUrl)
                .path("/api/users/verify-email")
                .queryParam("token", token)
                .toUriString();

        // ✅ HTML 버튼 포함 본문
        String subject = "[Detective] 이메일 인증";
        String htmlBody = buildVerifyHtml(created.getNickname(), verifyUrl, 24);

        // HTML 메일 발송 (SmtpEmailSender.setText(html, true)로 전송됨)
        emailSender.send(created.getEmail(), subject, htmlBody);

        return ResponseEntity.ok(Map.of(
                "message", "회원가입 성공! 이메일을 확인하고 인증을 완료하세요.",
                "index", created.getIndex(),
                "id", created.getId(),
                "email", created.getEmail(),
                "devVerifyUrl", verifyUrl
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

        String verifyUrl = UriComponentsBuilder
                .fromHttpUrl(backendBaseUrl)
                .path("/api/users/verify-email")
                .queryParam("token", token)
                .toUriString();

        String subject = "[Detective] 이메일 인증 재발송";
        String htmlBody = buildVerifyHtml(user.getNickname(), verifyUrl, 24);
        emailSender.send(user.getEmail(), subject, htmlBody);

        return ResponseEntity.ok(Map.of(
                "message", "인증 메일을 재발송했습니다.",
                "devVerifyUrl", verifyUrl
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

        // 미인증 사용자 차단(A안)
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

    // =======================
    // 이메일 HTML 템플릿
    // =======================
    private String buildVerifyHtml(String nickname, String verifyUrl, int hoursValid) {
        String safeName = nickname == null || nickname.isBlank() ? "회원" : nickname;
        return """
               <!doctype html>
               <html lang="ko">
               <head>
                 <meta charset="UTF-8" />
                 <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                 <title>이메일 인증</title>
               </head>
               <body style="margin:0; background:#f6f7fb; font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#222;">
                 <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
                   <tr>
                     <td align="center">
                       <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff; border:1px solid #eee; border-radius:12px; overflow:hidden;">
                         <tr>
                           <td style="padding:20px 24px; border-bottom:1px solid #f1f1f4;">
                             <h2 style="margin:0; font-size:18px;">Detective 이메일 인증</h2>
                           </td>
                         </tr>
                         <tr>
                           <td style="padding:24px;">
                             <p style="margin:0 0 12px; line-height:1.6;">안녕하세요, <strong>%s</strong>님!</p>
                             <p style="margin:0 0 20px; line-height:1.6;">아래 버튼을 눌러 이메일 인증을 완료해 주세요. 링크는 <strong>%d시간</strong> 동안 유효합니다.</p>
                             <p style="text-align:center; margin:24px 0;">
                               <a href="%s" style="display:inline-block; padding:12px 18px; background:#2d6cdf; color:#fff; text-decoration:none; border-radius:8px; font-weight:600;">
                                 이메일 인증하기
                               </a>
                             </p>
                             <p style="font-size:12px; color:#666; line-height:1.6; margin:0;">
                               버튼이 동작하지 않으면 아래 URL을 복사해 브라우저 주소창에 붙여넣으세요.<br/>
                               <span style="word-break:break-all; color:#2d6cdf;">%s</span>
                             </p>
                           </td>
                         </tr>
                         <tr>
                           <td style="padding:12px 24px; background:#fafafa; border-top:1px solid #f1f1f4; font-size:12px; color:#777;">
                             본 메일은 발신 전용입니다.
                           </td>
                         </tr>
                       </table>
                     </td>
                   </tr>
                 </table>
               </body>
               </html>
               """.formatted(safeName, hoursValid, verifyUrl, verifyUrl);
    }
}
