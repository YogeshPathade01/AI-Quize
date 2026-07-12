package com.igniterquiz.controller;

import com.igniterquiz.dto.*;
import com.igniterquiz.model.User;
import com.igniterquiz.service.ResultService;
import com.igniterquiz.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/results")
public class ResultController {

    @Autowired private ResultService resultService;
    @Autowired private UserService userService;

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<ResultDto>>> getMyResults(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(resultService.getMyResults(user.getId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ResultDto>> submitResult(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody SubmitResultRequest req) {
        User user = userService.getByEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Result submitted successfully", resultService.saveResult(user.getId(), req)));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<ApiResponse<List<LeaderboardEntry>>> getLeaderboard() {
        return ResponseEntity.ok(ApiResponse.ok(resultService.getLeaderboard()));
    }
}
