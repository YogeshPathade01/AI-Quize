package com.igniterquiz.service;

import com.igniterquiz.model.Notification;
import com.igniterquiz.repository.NotificationRepository;
import com.igniterquiz.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;
import java.util.ArrayList;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepo;

    @Autowired
    private UserRepository userRepository;

    public List<Notification> getNotificationsForUser(Long userId) {
        return notificationRepo.findByUserIdOrUserIdIsNullOrderByCreatedAtDesc(userId);
    }

    public Notification markAsRead(Long notificationId) {
        Optional<Notification> opt = notificationRepo.findById(notificationId);
        if (opt.isPresent()) {
            Notification n = opt.get();
            n.setRead(true);
            return notificationRepo.save(n);
        }
        throw new RuntimeException("Notification not found: " + notificationId);
    }

    public void markAllAsRead(Long userId) {
        List<Notification> list = notificationRepo.findByUserIdOrUserIdIsNullOrderByCreatedAtDesc(userId);
        for (Notification n : list) {
            n.setRead(true);
        }
        notificationRepo.saveAll(list);
    }

    public void dismissNotification(Long id) {
        notificationRepo.deleteById(id);
    }

    public Notification createNotification(Long userId, String icon, String title, String message, String type) {
        Notification n = Notification.builder()
            .userId(userId)
            .icon(icon)
            .title(title)
            .message(message)
            .time("Just now")
            .type(type)
            .read(false)
            .build();
        return notificationRepo.save(n);
    }
}
