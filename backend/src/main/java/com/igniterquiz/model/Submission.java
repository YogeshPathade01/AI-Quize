package com.igniterquiz.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "submissions")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Submission {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long examId;
    private String examTitle;
    private String candidateName;
    private String problemName;
    private String language;
    private int score;
    private int tabSwitches;
    private String status; // PENDING, APPROVED

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String code; // Contains detailed logs and selection info

    private String feedback;

    @Builder.Default
    private LocalDateTime submittedAt = LocalDateTime.now();
}
