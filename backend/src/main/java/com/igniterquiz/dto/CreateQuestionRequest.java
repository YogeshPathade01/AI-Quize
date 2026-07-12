package com.igniterquiz.dto;

import lombok.Data;

@Data
public class CreateQuestionRequest {
    private String text;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private int correctOptionIndex;
    private String explanation;
    private String difficulty; // "EASY", "MEDIUM", "HARD"
}
