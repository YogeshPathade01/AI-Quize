package com.igniterquiz.service;

import com.igniterquiz.model.Submission;
import com.igniterquiz.repository.SubmissionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class SubmissionService {

    @Autowired
    private SubmissionRepository submissionRepo;

    public List<Submission> getAllSubmissions() {
        List<Submission> list = submissionRepo.findAll();
        if (list.isEmpty()) {
            // Seed a few initial mock submissions if none exist
            Submission s1 = Submission.builder()
                .examId(1L)
                .examTitle("Web Technologies Quiz")
                .candidateName("Rahul Verma")
                .problemName("Assessment Quiz")
                .language("MCQ")
                .score(80)
                .tabSwitches(2)
                .status("PENDING")
                .code("EXAM LOG FOR RAHUL VERMA\nExam ID: 1\nExam Title: Web Technologies Quiz\nCandidate: Rahul Verma\nScore: 4 / 5 (80%)\nTab Switches: 2\n\nQ1: What does HTML stand for?\n  [✔] [A] Hyper Text Markup Language\n  Student Selection: [A]\n  Correct Answer: [A]\n  Status: CORRECT\n\nQ2: Which CSS property is used to change text color?\n  [✔] [B] color\n  Student Selection: [B]\n  Correct Answer: [B]\n  Status: CORRECT\n\nQ3: What is the correct syntax for referring to an external script?\n  [✔] [C] <script src=\"xxx.js\">\n  Student Selection: [C]\n  Correct Answer: [C]\n  Status: CORRECT\n\nQ4: How do you write \"Hello World\" in an alert box?\n  [✔] [D] alert(\"Hello World\");\n  Student Selection: [D]\n  Correct Answer: [D]\n  Status: CORRECT\n\nQ5: Which HTML tag is used to define an internal style sheet?\n  [✔] [C] <style>\n  Student Selection: [A]\n  Correct Answer: [C]\n  Status: INCORRECT\n")
                .build();

            Submission s2 = Submission.builder()
                .examId(1L)
                .examTitle("Web Technologies Quiz")
                .candidateName("Anjali Nair")
                .problemName("Assessment Quiz")
                .language("MCQ")
                .score(60)
                .tabSwitches(6)
                .status("PENDING")
                .code("EXAM LOG FOR ANJALI NAIR\nExam ID: 1\nExam Title: Web Technologies Quiz\nCandidate: Anjali Nair\nScore: 3 / 5 (60%)\nTab Switches: 6\n\nQ1: What does HTML stand for?\n  [✔] [A] Hyper Text Markup Language\n  Student Selection: [A]\n  Correct Answer: [A]\n  Status: CORRECT\n\nQ2: Which CSS property is used to change text color?\n  [✔] [B] color\n  Student Selection: [B]\n  Correct Answer: [B]\n  Status: CORRECT\n\nQ3: What is the correct syntax for referring to an external script?\n  [✔] [C] <script src=\"xxx.js\">\n  Student Selection: [A]\n  Correct Answer: [C]\n  Status: INCORRECT\n\nQ4: How do you write \"Hello World\" in an alert box?\n  [✔] [D] alert(\"Hello World\");\n  Student Selection: [D]\n  Correct Answer: [D]\n  Status: CORRECT\n\nQ5: Which HTML tag is used to define an internal style sheet?\n  [✔] [C] <style>\n  Student Selection: [B]\n  Correct Answer: [C]\n  Status: INCORRECT\n")
                .build();

            submissionRepo.saveAll(List.of(s1, s2));
            return submissionRepo.findAll();
        }
        return list;
    }

    public Submission saveSubmission(Submission submission) {
        return submissionRepo.save(submission);
    }

    public Submission moderateSubmission(Long id, int score, String feedback) {
        Optional<Submission> opt = submissionRepo.findById(id);
        if (opt.isPresent()) {
            Submission sub = opt.get();
            sub.setScore(score);
            sub.setFeedback(feedback);
            sub.setStatus("APPROVED");
            return submissionRepo.save(sub);
        }
        throw new RuntimeException("Submission not found: " + id);
    }

    public List<Submission> getTabSwitchLogs() {
        return submissionRepo.findByTabSwitchesGreaterThan(0);
    }
}
