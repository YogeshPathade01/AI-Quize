package com.igniterquiz.repository;

import com.igniterquiz.model.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, Long> {
    List<Submission> findByExamId(Long examId);
    List<Submission> findByTabSwitchesGreaterThan(int count);
}
