package com.lingoguma.detective_backend.user.service.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmtpEmailSender implements EmailSender {

    private final JavaMailSender mailSender;

    // application.properties
    @Value("${mail.from.address:${spring.mail.username}}")
    private String fromAddress;

    @Value("${mail.from.name:링고구마}")
    private String fromName;

    @Async // 비동기(AsyncConfig 필요)
    @Override
    public void send(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            helper.setFrom(fromAddress, fromName);
            mailSender.send(message);
            log.info("메일 발송 성공: to={}, subject={}", to, subject);
        } catch (MessagingException | MailException e) {
            log.error("메일 발송 실패: to={}, subject={}, cause={}", to, subject, e.getMessage(), e);
            throw new IllegalStateException("메일 발송 실패: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("메일 처리 중 알 수 없는 오류", e);
            throw new IllegalStateException("메일 처리 중 오류", e);
        }
    }
}
