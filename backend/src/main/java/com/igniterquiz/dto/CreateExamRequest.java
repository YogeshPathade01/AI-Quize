package com.igniterquiz.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CreateExamRequest {
    private String title;
    private String subject;
    private String description;
    private int duration;
    private String difficulty; // "EASY", "MEDIUM", "HARD"
    private String status; // "LIVE", "UPCOMING", "COMPLETED", "PRACTICE"
    private LocalDateTime scheduledAt;
    private List<CreateQuestionRequest> questions;
}
