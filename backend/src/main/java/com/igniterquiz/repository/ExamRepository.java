package com.igniterquiz.repository;

import com.igniterquiz.model.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ExamRepository extends JpaRepository<Exam, Long> {
    List<Exam> findByStatus(Exam.ExamStatus status);
    List<Exam> findByStatusOrderByScheduledAtAsc(Exam.ExamStatus status);

    // 1. Upcoming Exams: scheduledAt > now
    @Query("SELECT e FROM Exam e WHERE e.status <> 'PRACTICE' AND e.scheduledAt > :now ORDER BY e.scheduledAt ASC")
    List<Exam> findUpcomingExams(@Param("now") LocalDateTime now);

    // 2. Live Exams: scheduledAt <= now AND DATE_ADD(scheduledAt, INTERVAL duration MINUTE) > now
    @Query(value = "SELECT * FROM exams WHERE status <> 'PRACTICE' AND scheduled_at <= :now AND DATE_ADD(scheduled_at, INTERVAL duration MINUTE) > :now ORDER BY scheduled_at ASC", nativeQuery = true)
    List<Exam> findLiveExams(@Param("now") LocalDateTime now);

    // 3. Completed Exams: DATE_ADD(scheduled_at, INTERVAL duration MINUTE) <= now
    @Query(value = "SELECT * FROM exams WHERE status <> 'PRACTICE' AND DATE_ADD(scheduled_at, INTERVAL duration MINUTE) <= :now ORDER BY scheduled_at DESC", nativeQuery = true)
    List<Exam> findCompletedExams(@Param("now") LocalDateTime now);

    List<Exam> findByStatusNotOrderByScheduledAtAsc(Exam.ExamStatus status);
}
