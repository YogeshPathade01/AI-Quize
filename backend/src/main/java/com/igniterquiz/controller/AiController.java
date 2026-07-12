package com.igniterquiz.controller;

import com.igniterquiz.dto.ApiResponse;
import com.igniterquiz.dto.ExamDto;
import com.igniterquiz.model.Exam;
import com.igniterquiz.model.User;
import com.igniterquiz.dto.ResultDto;
import com.igniterquiz.service.ExamService;
import com.igniterquiz.service.GeminiService;
import com.igniterquiz.service.ResultService;
import com.igniterquiz.service.UserService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private UserService userService;

    @Autowired
    private ResultService resultService;

    @Autowired
    private ExamService examService;

    @PostMapping("/generate-quiz")
    public ResponseEntity<ApiResponse<ExamDto>> generateQuiz(@RequestBody QuizGenerationRequest request) {
        Exam exam = geminiService.generateAiQuiz(request.getTopic(), request.getDifficulty(), request.getNumQuestions());
        ExamDto dto = examService.getExamById(exam.getId());
        return ResponseEntity.ok(ApiResponse.ok("Quiz generated successfully", dto));
    }

    @PostMapping("/explain")
    public ResponseEntity<ApiResponse<String>> explainQuestion(@RequestBody ExplanationRequest request) {
        String explanation = geminiService.explainQuestion(
                request.getQuestionText(),
                request.getOptions(),
                request.getCorrectIndex(),
                request.getSelectedIndex(),
                request.getChatHistory()
        );
        return ResponseEntity.ok(ApiResponse.ok("Explanation retrieved", explanation));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> getRecommendations(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getByEmail(userDetails.getUsername());
        List<ResultDto> results = resultService.getMyResults(user.getId());

        StringBuilder summary = new StringBuilder();
        summary.append("User: ").append(user.getFirstName()).append(" ").append(user.getLastName()).append("\n");
        summary.append("Current Level: ").append(user.getLevel()).append(" (XP: ").append(user.getXp()).append(")\n");
        summary.append("Recent Quiz History:\n");
        
        if (results.isEmpty()) {
            summary.append("- No quiz results found. The user is a new student who hasn't completed any quizzes yet.\n");
        } else {
            for (int i = 0; i < Math.min(results.size(), 5); i++) {
                ResultDto r = results.get(i);
                summary.append("- ").append(r.getExamTitle())
                        .append(": Score ").append(r.getScore()).append("/").append(r.getTotalQuestions())
                        .append(" (").append(r.getPercentage()).append("%)\n");
            }
        }

        List<Map<String, String>> recommendations = geminiService.getRecommendations(summary.toString());
        return ResponseEntity.ok(ApiResponse.ok("Recommendations generated", recommendations));
    }

    // ── DTO CLASSES ──────────────────────────────────────────────────────────

    @Data
    public static class QuizGenerationRequest {
        private String topic;
        private String difficulty;
        private int numQuestions;
    }

    @Data
    public static class ExplanationRequest {
        private String questionText;
        private List<String> options;
        private int correctIndex;
        private Integer selectedIndex;
        private List<Map<String, String>> chatHistory;
    }
}
