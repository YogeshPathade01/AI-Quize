package com.igniterquiz.config;

import com.igniterquiz.model.*;
import com.igniterquiz.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.util.Random;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired private UserRepository userRepo;
    @Autowired private ExamRepository examRepo;
    @Autowired private QuestionRepository questionRepo;
    @Autowired private ExamResultRepository resultRepo;
    @Autowired private PasswordEncoder encoder;

    @Override
    public void run(String... args) {
        // ── Idempotency Check ─────────────────────────────────
        if (userRepo.count() > 0) {
            System.out.println("🌱 Database already has user data. Checking for evaluator user...");
            if (!userRepo.existsByEmail("teacher@example.com")) {
                User teacher = User.builder()
                    .firstName("Teacher").lastName("One")
                    .email("teacher@example.com")
                    .password(encoder.encode("password123"))
                    .role(User.Role.EVALUATOR)
                    .level(5).xp(2000).streak(10)
                    .build();
                userRepo.save(teacher);
                System.out.println("✅ Evaluator user seeded successfully!");
            }
            return;
        }

        System.out.println("🚀 Seeding Igniter Quiz database...");

        // ── Seed Users ────────────────────────────────────────
        User rahul = User.builder()
            .firstName("Rahul").lastName("Verma")
            .email("rahul@example.com")
            .password(encoder.encode("password123"))
            .role(User.Role.STUDENT)
            .level(4).xp(1250).streak(5)
            .build();

        User priya = User.builder()
            .firstName("Priya").lastName("Sharma")
            .email("priya@example.com")
            .password(encoder.encode("password123"))
            .role(User.Role.STUDENT)
            .level(8).xp(3840).streak(12)
            .build();

        User amit = User.builder()
            .firstName("Amit").lastName("Kumar")
            .email("amit@example.com")
            .password(encoder.encode("password123"))
            .role(User.Role.STUDENT)
            .level(8).xp(3620).streak(9)
            .build();

        User sneha = User.builder()
            .firstName("Sneha").lastName("Patel")
            .email("sneha@example.com")
            .password(encoder.encode("password123"))
            .role(User.Role.STUDENT)
            .level(7).xp(3410).streak(7)
            .build();

        User deepak = User.builder()
            .firstName("Deepak").lastName("Singh")
            .email("deepak@example.com")
            .password(encoder.encode("password123"))
            .role(User.Role.STUDENT)
            .level(4).xp(1180).streak(4)
            .build();

        User anjali = User.builder()
            .firstName("Anjali").lastName("Nair")
            .email("anjali@example.com")
            .password(encoder.encode("password123"))
            .role(User.Role.STUDENT)
            .level(3).xp(1050).streak(3)
            .build();

        User rohan = User.builder()
            .firstName("Rohan").lastName("Mehta")
            .email("rohan@example.com")
            .password(encoder.encode("password123"))
            .role(User.Role.STUDENT)
            .level(3).xp(980).streak(6)
            .build();

        User admin = User.builder()
            .firstName("Admin").lastName("User")
            .email("admin@igniterquiz.com")
            .password(encoder.encode("admin123"))
            .role(User.Role.ADMIN)
            .level(10).xp(5000).streak(30)
            .build();

        User teacher = User.builder()
            .firstName("Teacher").lastName("One")
            .email("teacher@example.com")
            .password(encoder.encode("password123"))
            .role(User.Role.EVALUATOR)
            .level(5).xp(2000).streak(10)
            .build();

        userRepo.save(rahul);
        userRepo.save(priya);
        userRepo.save(amit);
        userRepo.save(sneha);
        userRepo.save(deepak);
        userRepo.save(anjali);
        userRepo.save(rohan);
        userRepo.save(admin);
        userRepo.save(teacher);

        System.out.println("✅ Igniter Quiz seed data loaded successfully!");
    }

    private void createResult(User user, Exam exam, int score, int total, int xp, int rank, int timeSec) {
        ExamResult res = ExamResult.builder()
            .user(user)
            .exam(exam)
            .score(score)
            .totalQuestions(total)
            .xpEarned(xp)
            .rankk(rank)
            .timeTakenSeconds(timeSec)
            .completedAt(LocalDateTime.now().minusDays(new Random().nextInt(10) + 1))
            .build();
        resultRepo.save(res);
    }
}
