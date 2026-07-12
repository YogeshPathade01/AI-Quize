package com.igniterquiz.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "exam_results")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ExamResult {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne @JoinColumn(name = "exam_id", nullable = false)
    private Exam exam;

    private int score;
    private int totalQuestions;
    private int xpEarned;
    private int rankk;
    private long timeTakenSeconds;
    private LocalDateTime completedAt = LocalDateTime.now();

    public double getPercentage() {
        return totalQuestions > 0 ? (double) score / totalQuestions * 100 : 0;
    }
}
