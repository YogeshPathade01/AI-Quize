package com.igniterquiz.controller;

import com.igniterquiz.dto.*;
import com.igniterquiz.model.Question;
import com.igniterquiz.service.ExamService;
import com.igniterquiz.service.QuestionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    @Autowired private ExamService examService;
    @Autowired private QuestionService questionService;

    @GetMapping("/live")
    public ResponseEntity<ApiResponse<List<ExamDto>>> getLive() {
        return ResponseEntity.ok(ApiResponse.ok(examService.getLiveExams()));
    }

    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<List<ExamDto>>> getUpcoming() {
        return ResponseEntity.ok(ApiResponse.ok(examService.getUpcomingExams()));
    }

    @GetMapping("/completed")
    public ResponseEntity<ApiResponse<List<ExamDto>>> getCompleted() {
        return ResponseEntity.ok(ApiResponse.ok(examService.getCompletedExams()));
    }

    @GetMapping("/categorized")
    public ResponseEntity<ApiResponse<ExamCategorizedDto>> getCategorized() {
        return ResponseEntity.ok(ApiResponse.ok(examService.getCategorizedExams()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamDto>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(examService.getExamById(id)));
    }

    @GetMapping("/{id}/questions")
    public ResponseEntity<ApiResponse<List<Question>>> getQuestions(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(questionService.getQuestionsByExam(id)));
    }

    @GetMapping("/practice")
    public ResponseEntity<ApiResponse<List<Question>>> getPractice(
            @RequestParam(defaultValue = "all") String subject) {
        return ResponseEntity.ok(ApiResponse.ok(questionService.getQuestionsBySubject(subject)));
    }

    @PostMapping
    @PreAuthorize("hasRole('EVALUATOR') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ExamDto>> createExam(@RequestBody CreateExamRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Exam created successfully", examService.createExam(req)));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ExamDto>> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Exam status updated", examService.toggleExamStatus(id)));
    }

    @PostMapping("/{id}/enroll")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<ExamDto>> enroll(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Enrolled successfully", examService.enroll(id)));
    }

    @PostMapping("/{id}/reminder")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<ExamDto>> toggleReminder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Reminder toggled", examService.toggleReminder(id)));
    }



    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteExam(@PathVariable Long id) {
        examService.deleteExam(id);
        return ResponseEntity.ok(ApiResponse.ok("Exam deleted successfully", null));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('EVALUATOR') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ExamDto>> updateExam(
            @PathVariable Long id,
            @RequestBody CreateExamRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Exam updated successfully", examService.updateExam(id, req)));
    }
}
