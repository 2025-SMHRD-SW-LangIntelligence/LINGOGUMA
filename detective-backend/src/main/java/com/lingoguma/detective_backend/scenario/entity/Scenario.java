// src/main/java/com/lingoguma/detective_backend/scenario/entity/Scenario.java
package com.lingoguma.detective_backend.scenario.entity;

import com.lingoguma.detective_backend.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "scenarios",
       indexes = {
           @Index(name = "ix_scenarios_status", columnList = "status"),
           @Index(name = "ix_scenarios_submittedAt", columnList = "submittedAt")
       })
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Scenario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Lob
    @Column(nullable = false)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ScenarioStatus status;

    /** FK: users.user_index 를 참조 — DB 컬럼명 'author_id'에 맞춘다 */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", referencedColumnName = "user_index", nullable = false)
    private User author;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /** 제출 시각(정렬용) */
    private LocalDateTime submittedAt;
}
