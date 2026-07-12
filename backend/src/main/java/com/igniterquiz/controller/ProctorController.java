package com.igniterquiz.controller;

import com.igniterquiz.dto.ApiResponse;
import com.igniterquiz.model.ActiveSession;
import com.igniterquiz.model.User;
import com.igniterquiz.service.ActiveSessionService;
import com.igniterquiz.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/proctor/sessions")
public class ProctorController {

    @Autowired
    private ActiveSessionService sessionService;

    @Autowired
    private UserService userService;

    private User getCurrentUser(UserDetails userDetails) {
        return userService.getByEmail(userDetails.getUsername());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ActiveSession>> startSession(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, Object> body) {
        User user = getCurrentUser(userDetails);
        Long examId = ((Number) body.get("examId")).longValue();
        String examTitle = (String) body.get("examTitle");
        int totalQuestions = (Integer) body.get("totalQuestions");
        int timeRemaining = (Integer) body.get("timeRemaining");

        ActiveSession s = sessionService.startSession(
            user.getId(), user.getFullName(), examId, examTitle, totalQuestions, timeRemaining
        );
        return ResponseEntity.ok(ApiResponse.ok(s));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ActiveSession>> updateSession(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        int index = (Integer) body.get("currentQuestionIndex");
        int switches = (Integer) body.get("tabSwitches");
        int time = (Integer) body.get("timeRemaining");

        ActiveSession s = sessionService.updateSession(id, index, switches, time);
        return ResponseEntity.ok(ApiResponse.ok(s));
    }

    @GetMapping
    @PreAuthorize("hasRole('EVALUATOR') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<ActiveSession>>> getActiveSessions() {
        return ResponseEntity.ok(ApiResponse.ok(sessionService.getActiveSessions()));
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<ActiveSession>> getSessionStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam Long examId) {
        User user = getCurrentUser(userDetails);
        ActiveSession s = sessionService.getSessionByUserIdAndExamId(user.getId(), examId);
        return ResponseEntity.ok(ApiResponse.ok(s));
    }

    @PutMapping("/{id}/warn")
    @PreAuthorize("hasRole('EVALUATOR') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ActiveSession>> warn(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String message = body.get("message");
        ActiveSession s = sessionService.sendWarning(id, message);
        return ResponseEntity.ok(ApiResponse.ok("Warning sent", s));
    }

    @PutMapping("/{id}/pause")
    @PreAuthorize("hasRole('EVALUATOR') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ActiveSession>> togglePause(
            @PathVariable Long id) {
        ActiveSession s = sessionService.togglePause(id);
        return ResponseEntity.ok(ApiResponse.ok(s));
    }

    @PutMapping("/{id}/disqualify")
    @PreAuthorize("hasRole('EVALUATOR') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ActiveSession>> disqualify(
            @PathVariable Long id) {
        ActiveSession s = sessionService.disqualify(id);
        return ResponseEntity.ok(ApiResponse.ok("Student disqualified", s));
    }

    @PutMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<ActiveSession>> submit(
            @PathVariable Long id) {
        ActiveSession s = sessionService.submitSession(id);
        return ResponseEntity.ok(ApiResponse.ok("Session submitted", s));
    }
}
