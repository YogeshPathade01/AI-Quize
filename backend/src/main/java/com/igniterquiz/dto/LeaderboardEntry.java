package com.igniterquiz.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data @AllArgsConstructor
public class LeaderboardEntry {
    private int rank;
    private Long userId;
    private String name;
    private int xp;
    private int level;
    private int streak;
    private int examsCompleted;
    private double accuracy;
}
