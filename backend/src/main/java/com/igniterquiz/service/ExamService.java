package com.igniterquiz.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.igniterquiz.dto.CreateExamRequest;
import com.igniterquiz.dto.CreateQuestionRequest;
import com.igniterquiz.dto.ExamCategorizedDto;
import com.igniterquiz.dto.ExamDto;
import com.igniterquiz.model.Exam;
import com.igniterquiz.model.ExamResult;
import com.igniterquiz.model.Question;
import com.igniterquiz.model.User;
import com.igniterquiz.repository.ActiveSessionRepository;
import com.igniterquiz.repository.ExamRepository;
import com.igniterquiz.repository.ExamResultRepository;
import com.igniterquiz.repository.UserRepository;

@Service
public class ExamService {

    @Autowired private ExamRepository examRepo;
    @Autowired private ExamResultRepository examResultRepo;
    @Autowired private ActiveSessionRepository activeSessionRepo;
    @Autowired private UserRepository userRepo;

    public List<ExamDto> getLiveExams() {
        LocalDateTime now = LocalDateTime.now();
        return examRepo.findLiveExams(now)
            .stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<ExamDto> getUpcomingExams() {
        LocalDateTime now = LocalDateTime.now();
        return examRepo.findUpcomingExams(now)
            .stream().map(this::toDto).collect(Collectors.toList());
    }

    public List<ExamDto> getCompletedExams() {
        User current = getCurrentUser();
        if (current != null && current.getRole() == User.Role.STUDENT) {
            List<ExamResult> results = examResultRepo.findByUserIdOrderByCompletedAtDesc(current.getId());
            return results.stream()
                .map(r -> toDto(r.getExam()))
                .collect(Collectors.toList());
        }
        LocalDateTime now = LocalDateTime.now();
        return examRepo.findCompletedExams(now)
            .stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * Dynamically categorizes active (non-practice) exams based on the current server time:
     * - Upcoming: current_time < start_time (scheduledAt)
     * - Live: current_time >= start_time AND current_time < (start_time + duration)
     * - Completed: current_time >= (start_time + duration)
     */
    public ExamCategorizedDto getCategorizedExams() {
        LocalDateTime now = LocalDateTime.now();
        List<Exam> activeExams = examRepo.findByStatusNotOrderByScheduledAtAsc(Exam.ExamStatus.PRACTICE);

        List<ExamDto> upcoming = new java.util.ArrayList<>();
        List<ExamDto> live = new java.util.ArrayList<>();
        List<ExamDto> completed = new java.util.ArrayList<>();

        User current = getCurrentUser();
        List<Long> completedExamIds = new java.util.ArrayList<>();
        if (current != null && current.getRole() == User.Role.STUDENT) {
            completedExamIds = examResultRepo.findByUserIdOrderByCompletedAtDesc(current.getId())
                .stream().map(r -> r.getExam().getId()).collect(Collectors.toList());
        }

        for (Exam e : activeExams) {
            if (e.getScheduledAt() == null) {
                continue;
            }
            ExamDto dto = toDto(e);
            LocalDateTime startTime = e.getScheduledAt();
            LocalDateTime endTime = startTime.plusMinutes(e.getDuration());

            // Exact start time -> LIVE (now >= startTime)
            // Exact end time -> COMPLETED (now >= endTime)
            if (now.isBefore(startTime)) {
                upcoming.add(dto);
            } else if (now.isBefore(endTime)) {
                live.add(dto);
            } else {
                if (current != null && current.getRole() == User.Role.STUDENT) {
                    if (completedExamIds.contains(e.getId())) {
                        completed.add(dto);
                    }
                } else {
                    completed.add(dto);
                }
            }
        }

        // Sort completed exams descending by scheduledAt (most recent first)
        completed.sort((a, b) -> b.getScheduledAt().compareTo(a.getScheduledAt()));

        return ExamCategorizedDto.builder()
                .upcoming(upcoming)
                .live(live)
                .completed(completed)
                .build();
    }

    public ExamDto getExamById(Long id) {
        return examRepo.findById(id)
            .map(this::toDto)
            .orElseThrow(() -> new RuntimeException("Exam not found: " + id));
    }

    public ExamDto createExam(CreateExamRequest req) {
        Exam.Difficulty difficulty = Exam.Difficulty.MEDIUM;
        if (req.getDifficulty() != null) {
            try {
                difficulty = Exam.Difficulty.valueOf(req.getDifficulty().toUpperCase());
            } catch (Exception ignored) {}
        }

        LocalDateTime scheduledAt = req.getScheduledAt() != null ? req.getScheduledAt() : LocalDateTime.now();
        Exam.ExamStatus status = Exam.ExamStatus.UPCOMING;
        if (!scheduledAt.isAfter(LocalDateTime.now())) {
            status = Exam.ExamStatus.LIVE;
        }

        int totalQs = req.getQuestions() != null ? req.getQuestions().size() : 0;
        int maxXP = totalQs * 10;

        Exam exam = Exam.builder()
                .title(req.getTitle())
                .subject(req.getSubject())
                .description(req.getDescription())
                .duration(req.getDuration())
                .maxXP(maxXP)
                .totalQuestions(totalQs)
                .difficulty(difficulty)
                .status(status)
                .scheduledAt(scheduledAt)
                .enrolledCount(0)
                .questions(new ArrayList<>())
                .build();

        if (req.getQuestions() != null) {
            for (CreateQuestionRequest qReq : req.getQuestions()) {
                Question.Difficulty qDiff = Question.Difficulty.MEDIUM;
                if (qReq.getDifficulty() != null) {
                    try {
                        qDiff = Question.Difficulty.valueOf(qReq.getDifficulty().toUpperCase());
                    } catch (Exception ignored) {}
                }

                Question question = Question.builder()
                        .text(qReq.getText())
                        .optionA(qReq.getOptionA())
                        .optionB(qReq.getOptionB())
                        .optionC(qReq.getOptionC())
                        .optionD(qReq.getOptionD())
                        .correctOptionIndex(qReq.getCorrectOptionIndex())
                        .explanation(qReq.getExplanation())
                        .subject(req.getSubject())
                        .difficulty(qDiff)
                        .exam(exam)
                        .build();
                exam.getQuestions().add(question);
            }
        }

        Exam saved = examRepo.save(exam);
        return toDto(saved);
    }

    private User getCurrentUser() {
        try {
            org.springframework.security.core.Authentication auth = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !(auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)) {
                return userRepo.findByEmail(auth.getName()).orElse(null);
            }
        } catch (Exception ignored) {}
        return null;
    }

    private ExamDto toDto(Exam e) {
        ExamDto dto = new ExamDto();
        dto.setId(e.getId());
        dto.setTitle(e.getTitle());
        dto.setSubject(e.getSubject());
        dto.setDescription(e.getDescription());
        dto.setDuration(e.getDuration());
        dto.setMaxXP(e.getMaxXP());
        dto.setTotalQuestions(e.getTotalQuestions());
        dto.setDifficulty(e.getDifficulty().name());

        String computedStatus = e.getStatus().name();
        if (e.getStatus() != Exam.ExamStatus.PRACTICE && e.getScheduledAt() != null) {
            LocalDateTime now = LocalDateTime.now();
            if (now.isBefore(e.getScheduledAt())) {
                computedStatus = "UPCOMING";
            } else {
                LocalDateTime endTime = e.getScheduledAt().plusMinutes(e.getDuration());
                if (!now.isBefore(endTime)) {
                    computedStatus = "COMPLETED";
                } else {
                    computedStatus = "LIVE";
                }
            }
        }
        dto.setStatus(computedStatus);

        dto.setScheduledAt(e.getScheduledAt());
        dto.setEnrolledCount(e.getEnrolledCount());

        User current = getCurrentUser();
        if (current != null) {
            dto.setEnrolled(current.getEnrolledExams().stream().anyMatch(ex -> ex.getId().equals(e.getId())));
            dto.setHasReminder(current.getReminderExams().stream().anyMatch(ex -> ex.getId().equals(e.getId())));
        } else {
            dto.setEnrolled(false);
            dto.setHasReminder(false);
        }
        return dto;
    }

    public ExamDto toggleExamStatus(Long id) {
        Exam exam = examRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));
        LocalDateTime now = LocalDateTime.now();
        if (exam.getScheduledAt() != null) {
            if (now.isBefore(exam.getScheduledAt())) {
                // UPCOMING -> LIVE
                exam.setScheduledAt(now);
                exam.setStatus(Exam.ExamStatus.LIVE);
            } else {
                LocalDateTime endTime = exam.getScheduledAt().plusMinutes(exam.getDuration());
                if (now.isBefore(endTime)) {
                    // LIVE -> COMPLETED
                    exam.setScheduledAt(now.minusMinutes(exam.getDuration() + 1));
                    exam.setStatus(Exam.ExamStatus.COMPLETED);
                } else {
                    // COMPLETED -> LIVE
                    exam.setScheduledAt(now);
                    exam.setStatus(Exam.ExamStatus.LIVE);
                }
            }
        } else {
            exam.setScheduledAt(now);
            exam.setStatus(Exam.ExamStatus.LIVE);
        }
        Exam saved = examRepo.save(exam);
        return toDto(saved);
    }

    @Transactional
    public ExamDto enroll(Long id) {
        User user = getCurrentUser();
        if (user == null) {
            throw new RuntimeException("Authentication required to enroll");
        }
        Exam exam = examRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));
        if (!user.getEnrolledExams().stream().anyMatch(e -> e.getId().equals(exam.getId()))) {
            user.getEnrolledExams().add(exam);
            exam.setEnrolledCount(exam.getEnrolledCount() + 1);
            examRepo.save(exam);
            userRepo.save(user);
        }
        return toDto(exam);
    }

    @Transactional
    public ExamDto toggleReminder(Long id) {
        User user = getCurrentUser();
        if (user == null) {
            throw new RuntimeException("Authentication required");
        }
        Exam exam = examRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));
        boolean removed = user.getReminderExams().removeIf(e -> e.getId().equals(exam.getId()));
        if (!removed) {
            user.getReminderExams().add(exam);
        }
        userRepo.save(user);
        return toDto(exam);
    }


    @Transactional
    public void deleteExam(Long id) {
        Exam exam = examRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));
        examResultRepo.deleteByExamId(id);
        activeSessionRepo.deleteByExamId(id);
        examRepo.delete(exam);
    }

    @Transactional
    public ExamDto updateExam(Long id, CreateExamRequest req) {
        Exam exam = examRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Exam not found: " + id));

        Exam.Difficulty difficulty = Exam.Difficulty.MEDIUM;
        if (req.getDifficulty() != null) {
            try {
                difficulty = Exam.Difficulty.valueOf(req.getDifficulty().toUpperCase());
            } catch (Exception ignored) {}
        }

        exam.setTitle(req.getTitle());
        exam.setSubject(req.getSubject());
        exam.setDescription(req.getDescription());
        exam.setDuration(req.getDuration());
        exam.setDifficulty(difficulty);
        if (req.getScheduledAt() != null) {
            exam.setScheduledAt(req.getScheduledAt());
        }

        // Clear existing questions to trigger orphan removal
        exam.getQuestions().clear();

        // Add questions from request
        if (req.getQuestions() != null) {
            for (CreateQuestionRequest qReq : req.getQuestions()) {
                Question.Difficulty qDiff = Question.Difficulty.MEDIUM;
                if (qReq.getDifficulty() != null) {
                    try {
                        qDiff = Question.Difficulty.valueOf(qReq.getDifficulty().toUpperCase());
                    } catch (Exception ignored) {}
                }

                Question question = Question.builder()
                        .text(qReq.getText())
                        .optionA(qReq.getOptionA())
                        .optionB(qReq.getOptionB())
                        .optionC(qReq.getOptionC())
                        .optionD(qReq.getOptionD())
                        .correctOptionIndex(qReq.getCorrectOptionIndex())
                        .explanation(qReq.getExplanation())
                        .subject(req.getSubject())
                        .difficulty(qDiff)
                        .exam(exam)
                        .build();
                exam.getQuestions().add(question);
            }
        }

        exam.setTotalQuestions(exam.getQuestions().size());
        exam.setMaxXP(exam.getQuestions().size() * 10);

        Exam saved = examRepo.save(exam);
        return toDto(saved);
    }
}
