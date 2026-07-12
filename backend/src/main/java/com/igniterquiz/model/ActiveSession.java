package com.igniterquiz.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "active_sessions")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ActiveSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private String studentName;
    private Long examId;
    private String examTitle;
    
    private int currentQuestionIndex;
    private int totalQuestions;
    private int tabSwitches;
    private int timeRemaining;
    
    private boolean isPaused = false;
    private boolean isDisqualified = false;
    private String warningMessage;

    private String status; // ACTIVE, PAUSED, DISQUALIFIED, SUBMITTED

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
