package com.igniterquiz.controller;

import com.igniterquiz.dto.ApiResponse;
import com.igniterquiz.model.Notification;
import com.igniterquiz.model.User;
import com.igniterquiz.service.NotificationService;
import com.igniterquiz.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserService userService;

    private User getCurrentUser(UserDetails userDetails) {
        return userService.getByEmail(userDetails.getUsername());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Notification>>> getNotifications(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        List<Notification> list = notificationService.getNotificationsForUser(user.getId());
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Notification>> markRead(
            @PathVariable Long id) {
        Notification updated = notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.ok(updated));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<String>> markAllRead(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        notificationService.markAllAsRead(user.getId());
        return ResponseEntity.ok(ApiResponse.ok("All notifications marked as read", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> dismiss(
            @PathVariable Long id) {
        notificationService.dismissNotification(id);
        return ResponseEntity.ok(ApiResponse.ok("Notification dismissed", null));
    }
}
