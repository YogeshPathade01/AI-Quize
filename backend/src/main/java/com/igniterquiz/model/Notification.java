package com.igniterquiz.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId; // Null indicates global system notifications

    private String icon;
    private String title;
    private String message;
    private String time;
    @Column(name = "is_read")
    private boolean read = false;
    private String type; // success, info, warning, danger

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
