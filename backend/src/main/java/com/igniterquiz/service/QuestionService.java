package com.igniterquiz.service;

import com.igniterquiz.model.Question;
import com.igniterquiz.repository.QuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Collections;
import java.util.List;

@Service
public class QuestionService {

    @Autowired private QuestionRepository questionRepo;

    public List<Question> getQuestionsByExam(Long examId) {
        List<Question> questions = questionRepo.findByExamId(examId);
        Collections.shuffle(questions);
        return questions;
    }

    public List<Question> getQuestionsBySubject(String subject) {
        if (subject == null || subject.isBlank() || subject.equalsIgnoreCase("all"))
            return questionRepo.findAll();
        return questionRepo.findBySubjectIgnoreCase(subject);
    }
}
