package com.igniterquiz.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data @AllArgsConstructor
public class AuthResponse {
    private String token;
    private String type = "Bearer";
    private Long userId;
    private String name;
    private String email;
    private String role;
    private int level;
    private int xp;
    private int streak;

    public AuthResponse(String token, Long userId, String name, String email,
                        String role, int level, int xp, int streak) {
        this.token = token;
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.role = role;
        this.level = level;
        this.xp = xp;
        this.streak = streak;
    }
}
