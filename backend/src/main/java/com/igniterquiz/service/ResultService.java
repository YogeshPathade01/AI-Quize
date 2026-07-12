package com.igniterquiz.service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.igniterquiz.dto.LeaderboardEntry;
import com.igniterquiz.dto.ResultDto;
import com.igniterquiz.model.Exam;
import com.igniterquiz.model.ExamResult;
import com.igniterquiz.model.User;
import com.igniterquiz.repository.ExamRepository;
import com.igniterquiz.repository.ExamResultRepository;
import com.igniterquiz.repository.UserRepository;

@Service
public class ResultService {

    @Autowired private ExamResultRepository resultRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private ExamRepository examRepo;

    public List<ResultDto> getMyResults(Long userId) {
        return resultRepo.findByUserIdOrderByCompletedAtDesc(userId)
            .stream().map(this::toDto).collect(Collectors.toList());
    }

    public ResultDto saveResult(Long userId, com.igniterquiz.dto.SubmitResultRequest req) {
        User user = userRepo.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        Exam exam = examRepo.findById(req.getExamId())
            .orElseThrow(() -> new RuntimeException("Exam not found: " + req.getExamId()));

        int xpEarned = req.getScore() * 10; // 10 XP per correct answer
        
        // Update user XP & Level
        user.setXp(user.getXp() + xpEarned);
        int newLevel = (user.getXp() / 500) + 1;
        user.setLevel(newLevel);
        userRepo.save(user);

        // Calculate rank
        List<ExamResult> existingResults = resultRepo.findByExamId(exam.getId());
        int rank = 1;
        for (ExamResult r : existingResults) {
            if (r.getScore() > req.getScore()) {
                rank++;
            }
        }

        ExamResult result = ExamResult.builder()
            .user(user)
            .exam(exam)
            .score(req.getScore())
            .totalQuestions(req.getTotalQuestions())
            .xpEarned(xpEarned)
            .rankk(rank)
            .timeTakenSeconds(req.getTimeTakenSeconds())
            .completedAt(java.time.LocalDateTime.now())
            .build();

        ExamResult saved = resultRepo.save(result);
        return toDto(saved);
    }

    public List<LeaderboardEntry> getLeaderboard() {
        List<User> users = userRepo.findAllOrderByXpDesc();
        List<LeaderboardEntry> board = new ArrayList<>();
        for (int i = 0; i < users.size(); i++) {
            User u = users.get(i);
            long exams = resultRepo.countByUserId(u.getId());
            Double acc = resultRepo.avgAccuracyByUserId(u.getId());
            board.add(new LeaderboardEntry(
                i + 1, u.getId(), u.getFullName(),
                u.getXp(), u.getLevel(), u.getStreak(),
                (int) exams, acc != null ? Math.round(acc * 10.0) / 10.0 : 0.0
            ));
        }
        return board;
    }

    private ResultDto toDto(ExamResult r) {
        ResultDto dto = new ResultDto();
        dto.setId(r.getId());
        dto.setExamId(r.getExam().getId());
        dto.setExamTitle(r.getExam().getTitle());
        dto.setScore(r.getScore());
        dto.setTotalQuestions(r.getTotalQuestions());
        dto.setPercentage(r.getPercentage());
        dto.setXpEarned(r.getXpEarned());
        dto.setRank(r.getRankk());
        dto.setTimeTakenSeconds(r.getTimeTakenSeconds());
        dto.setCompletedAt(r.getCompletedAt());
        return dto;
    }
}
