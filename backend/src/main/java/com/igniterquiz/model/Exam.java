package com.igniterquiz.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "exams")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Exam {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String subject;
    private String description;
    private int duration;
    private int maxXP;
    private int totalQuestions;

    @Enumerated(EnumType.STRING)
    private Difficulty difficulty = Difficulty.MEDIUM;

    @Enumerated(EnumType.STRING)
    private ExamStatus status = ExamStatus.UPCOMING;

    private LocalDateTime scheduledAt;
    private LocalDateTime createdAt = LocalDateTime.now();
    private int enrolledCount = 0;

    @OneToMany(mappedBy = "exam", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Question> questions = new ArrayList<>();

    public enum Difficulty { EASY, MEDIUM, HARD }
    public enum ExamStatus { LIVE, UPCOMING, COMPLETED, PRACTICE }
}
