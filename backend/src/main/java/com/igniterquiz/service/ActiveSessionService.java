package com.igniterquiz.service;

import com.igniterquiz.model.ActiveSession;
import com.igniterquiz.repository.ActiveSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ActiveSessionService {

    @Autowired
    private ActiveSessionRepository sessionRepo;

    public ActiveSession startSession(Long userId, String studentName, Long examId, String examTitle, int totalQuestions, int timeRemaining) {
        Optional<ActiveSession> existing = sessionRepo.findByUserIdAndExamId(userId, examId);
        if (existing.isPresent()) {
            ActiveSession s = existing.get();
            // Reset to ACTIVE if they were previously blocked/finished, or just return existing
            s.setStatus("ACTIVE");
            s.setPaused(false);
            s.setDisqualified(false);
            s.setWarningMessage(null);
            s.setUpdatedAt(LocalDateTime.now());
            return sessionRepo.save(s);
        }

        ActiveSession s = ActiveSession.builder()
            .userId(userId)
            .studentName(studentName)
            .examId(examId)
            .examTitle(examTitle)
            .totalQuestions(totalQuestions)
            .timeRemaining(timeRemaining)
            .currentQuestionIndex(0)
            .tabSwitches(0)
            .status("ACTIVE")
            .build();
        return sessionRepo.save(s);
    }

    public ActiveSession updateSession(Long sessionId, int currentQuestionIndex, int tabSwitches, int timeRemaining) {
        ActiveSession s = sessionRepo.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found: " + sessionId));
        
        if (!s.isPaused() && !s.isDisqualified()) {
            s.setCurrentQuestionIndex(currentQuestionIndex);
            s.setTabSwitches(tabSwitches);
            s.setTimeRemaining(timeRemaining);
            s.setUpdatedAt(LocalDateTime.now());
        }
        return sessionRepo.save(s);
    }

    public List<ActiveSession> getActiveSessions() {
        // Find any sessions that are active, paused, or disqualified
        return sessionRepo.findByStatusIn(List.of("ACTIVE", "PAUSED", "DISQUALIFIED"));
    }

    public ActiveSession getSessionById(Long id) {
        return sessionRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Session not found: " + id));
    }

    public ActiveSession getSessionByUserIdAndExamId(Long userId, Long examId) {
        return sessionRepo.findByUserIdAndExamId(userId, examId)
            .orElse(null);
    }

    public ActiveSession sendWarning(Long id, String warning) {
        ActiveSession s = getSessionById(id);
        s.setWarningMessage(warning);
        s.setUpdatedAt(LocalDateTime.now());
        return sessionRepo.save(s);
    }

    public ActiveSession togglePause(Long id) {
        ActiveSession s = getSessionById(id);
        s.setPaused(!s.isPaused());
        s.setStatus(s.isPaused() ? "PAUSED" : "ACTIVE");
        s.setUpdatedAt(LocalDateTime.now());
        return sessionRepo.save(s);
    }

    public ActiveSession disqualify(Long id) {
        ActiveSession s = getSessionById(id);
        s.setDisqualified(true);
        s.setStatus("DISQUALIFIED");
        s.setUpdatedAt(LocalDateTime.now());
        return sessionRepo.save(s);
    }

    public ActiveSession submitSession(Long id) {
        ActiveSession s = getSessionById(id);
        s.setStatus("SUBMITTED");
        s.setUpdatedAt(LocalDateTime.now());
        return sessionRepo.save(s);
    }
}
