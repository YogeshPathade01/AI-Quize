package com.igniterquiz.dto;

import lombok.Data;

@Data
public class SubmitResultRequest {
    private Long examId;
    private int score;
    private int totalQuestions;
    private long timeTakenSeconds;
}
