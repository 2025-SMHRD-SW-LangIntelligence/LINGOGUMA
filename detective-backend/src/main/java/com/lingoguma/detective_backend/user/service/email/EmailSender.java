package com.lingoguma.detective_backend.user.service.email;

public interface EmailSender {
    void send(String to, String subject, String content);
}

