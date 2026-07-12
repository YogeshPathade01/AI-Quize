package com.igniterquiz.service;

import com.igniterquiz.model.User;
import com.igniterquiz.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    @Autowired private UserRepository userRepo;
    @Autowired private ExamResultRepository examResultRepo;
    @Autowired private NotificationRepository notificationRepo;
    @Autowired private ActiveSessionRepository activeSessionRepo;

    public User getByEmail(String email) {
        return userRepo.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    public User getById(Long id) {
        return userRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found: " + id));
    }

    public User updateProfile(Long id, String firstName, String lastName) {
        User user = getById(id);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        return userRepo.save(user);
    }

    public void addXp(Long userId, int xp) {
        User user = getById(userId);
        user.setXp(user.getXp() + xp);
        int newLevel = 1 + user.getXp() / 500;
        user.setLevel(newLevel);
        userRepo.save(user);
    }

    public java.util.List<User> getAllUsers() {
        return userRepo.findAll();
    }

    public User updateUserRole(Long id, String roleName) {
        User user = getById(id);
        user.setRole(User.Role.valueOf(roleName.toUpperCase()));
        return userRepo.save(user);
    }

    public User updateUser(Long id, User details) {
        User user = getById(id);
        user.setFirstName(details.getFirstName());
        user.setLastName(details.getLastName());
        user.setEmail(details.getEmail());
        user.setRole(details.getRole());
        user.setLevel(details.getLevel());
        user.setXp(details.getXp());
        user.setStreak(details.getStreak());
        return userRepo.save(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = getById(id);
        examResultRepo.deleteByUserId(id);
        notificationRepo.deleteByUserId(id);
        activeSessionRepo.deleteByUserId(id);
        userRepo.delete(user);
    }
}
