package com.igniterquiz.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ResultDto {
    private Long id;
    private Long examId;
    private String examTitle;
    private int score;
    private int totalQuestions;
    private double percentage;
    private int xpEarned;
    private int rank;
    private long timeTakenSeconds;
    private LocalDateTime completedAt;
}
