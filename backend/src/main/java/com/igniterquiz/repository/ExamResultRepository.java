package com.igniterquiz.repository;

import com.igniterquiz.model.ExamResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ExamResultRepository extends JpaRepository<ExamResult, Long> {
    List<ExamResult> findByUserIdOrderByCompletedAtDesc(Long userId);
    List<ExamResult> findByExamId(Long examId);

    @Query("SELECT COUNT(r) FROM ExamResult r WHERE r.user.id = :userId")
    long countByUserId(@Param("userId") Long userId);

    @Query("SELECT AVG(r.score * 100.0 / r.totalQuestions) FROM ExamResult r WHERE r.user.id = :userId")
    Double avgAccuracyByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM ExamResult r WHERE r.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM ExamResult r WHERE r.exam.id = :examId")
    void deleteByExamId(@Param("examId") Long examId);
}
