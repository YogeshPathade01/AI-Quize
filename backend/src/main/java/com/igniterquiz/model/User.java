package com.igniterquiz.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    @Email @NotBlank @Column(unique = true)
    private String email;

    @NotBlank
    private String password;

    @Enumerated(EnumType.STRING)
    private Role role = Role.STUDENT;

    private int level = 1;
    private int xp = 0;
    private int streak = 0;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt = LocalDateTime.now();

    private String resetToken;
    private LocalDateTime resetTokenExpiry;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_enrollments",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "exam_id")
    )
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<Exam> enrolledExams = new java.util.ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_reminders",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "exam_id")
    )
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<Exam> reminderExams = new java.util.ArrayList<>();

    public String getFullName() { return firstName + " " + lastName; }

    public enum Role { STUDENT, ADMIN, EVALUATOR }
}
