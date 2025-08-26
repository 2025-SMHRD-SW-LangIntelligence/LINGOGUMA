package com.lingoguma.detective_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EntityScan(basePackages = "com.lingoguma.detective_backend")              // ✅ 엔티티 스캔
@EnableJpaRepositories(basePackages = "com.lingoguma.detective_backend")   // ✅ JPA 리포지토리 스캔
public class DetectiveBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(DetectiveBackendApplication.class, args);
    }
}