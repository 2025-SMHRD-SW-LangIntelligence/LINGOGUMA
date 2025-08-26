// src/main/java/com/lingoguma/detective_backend/global/config/JpaDebugConfig.java
package com.lingoguma.detective_backend.global.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.metamodel.EntityType;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JpaDebugConfig {
  @Bean
  CommandLineRunner printEntities(EntityManager em) {
    return args -> {
      System.out.println("=== Managed Entities ===");
      for (EntityType<?> e : em.getMetamodel().getEntities()) {
        System.out.println(" - " + e.getJavaType().getName());
      }
    };
  }
}
