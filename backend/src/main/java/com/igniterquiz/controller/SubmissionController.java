package com.igniterquiz.controller;

import com.igniterquiz.dto.ApiResponse;
import com.igniterquiz.model.Submission;
import com.igniterquiz.service.SubmissionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    @Autowired
    private SubmissionService submissionService;

    @GetMapping
    @PreAuthorize("hasRole('EVALUATOR') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Submission>>> getSubmissions() {
        return ResponseEntity.ok(ApiResponse.ok(submissionService.getAllSubmissions()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Submission>> submit(@RequestBody Submission submission) {
        Submission saved = submissionService.saveSubmission(submission);
        return ResponseEntity.ok(ApiResponse.ok("Submission saved successfully", saved));
    }

    @PutMapping("/{id}/moderate")
    @PreAuthorize("hasRole('EVALUATOR') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Submission>> moderate(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        int score = (Integer) body.get("score");
        String feedback = (String) body.get("feedback");
        Submission moderated = submissionService.moderateSubmission(id, score, feedback);
        return ResponseEntity.ok(ApiResponse.ok("Submission moderated successfully", moderated));
    }

    @GetMapping("/tab-switch-logs")
    @PreAuthorize("hasRole('EVALUATOR') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Submission>>> getTabSwitchLogs() {
        return ResponseEntity.ok(ApiResponse.ok(submissionService.getTabSwitchLogs()));
    }
}
