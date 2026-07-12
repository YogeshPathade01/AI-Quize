package com.igniterquiz.repository;

import com.igniterquiz.model.ActiveSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ActiveSessionRepository extends JpaRepository<ActiveSession, Long> {
    Optional<ActiveSession> findByUserIdAndExamId(Long userId, Long examId);
    List<ActiveSession> findByStatus(String status);
    List<ActiveSession> findByStatusIn(List<String> statuses);

    @Modifying
    @Query("DELETE FROM ActiveSession s WHERE s.userId = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM ActiveSession s WHERE s.examId = :examId")
    void deleteByExamId(@Param("examId") Long examId);
}
