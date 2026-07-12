package com.igniterquiz.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ExamDto {
    private Long id;
    private String title;
    private String subject;
    private String description;
    private int duration;
    private int maxXP;
    private int totalQuestions;
    private String difficulty;
    private String status;
    private LocalDateTime scheduledAt;
    private int enrolledCount;
    private boolean isEnrolled;
    private boolean hasReminder;
}
