package com.igniterquiz.service;

import com.igniterquiz.dto.*;
import com.igniterquiz.model.User;
import com.igniterquiz.repository.UserRepository;
import com.igniterquiz.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    @Autowired private UserRepository userRepo;
    @Autowired private PasswordEncoder encoder;
    @Autowired private AuthenticationManager authManager;
    @Autowired private JwtUtils jwtUtils;
    @Autowired(required = false) private JavaMailSender mailSender;

    @Value("${app.google.client-id}")
    private String googleClientId;

    private final RestTemplate restTemplate = new RestTemplate();

    public AuthResponse loginWithGoogle(GoogleLoginRequest req) {
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + req.getIdToken();
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new RuntimeException("Failed to verify Google ID token");
            }

            Map<String, Object> body = response.getBody();
            String aud = (String) body.get("aud");
            if (aud == null || !aud.equals(googleClientId)) {
                throw new RuntimeException("Invalid token audience");
            }

            String emailVerifiedStr = String.valueOf(body.get("email_verified"));
            if (!"true".equalsIgnoreCase(emailVerifiedStr)) {
                throw new RuntimeException("Google email is not verified");
            }

            String email = (String) body.get("email");
            if (email == null) {
                throw new RuntimeException("Email not found in Google token");
            }

            String firstName = (String) body.get("given_name");
            if (firstName == null) {
                firstName = (String) body.get("name");
                if (firstName == null) firstName = "Google";
            }
            String lastName = (String) body.get("family_name");
            if (lastName == null) {
                lastName = "User";
            }

            Optional<User> userOpt = userRepo.findByEmail(email);
            User user;
            if (userOpt.isPresent()) {
                user = userOpt.get();
            } else {
                user = User.builder()
                    .firstName(firstName)
                    .lastName(lastName)
                    .email(email)
                    .password(encoder.encode(UUID.randomUUID().toString()))
                    .role(User.Role.STUDENT)
                    .build();
                user = userRepo.save(user);
            }

            String token = jwtUtils.generateTokenFromEmail(user.getEmail());
            return new AuthResponse(token, user.getId(), user.getFullName(),
                user.getEmail(), user.getRole().name(), user.getLevel(), user.getXp(), user.getStreak());
        } catch (Exception e) {
            throw new RuntimeException("Google authentication failed: " + e.getMessage());
        }
    }

    public AuthResponse login(AuthRequest req) {
        Authentication auth = authManager.authenticate(
            new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword()));
        if(auth == null || !auth.isAuthenticated())
			throw new RuntimeException("Invalid email or password");
        String token = jwtUtils.generateToken(auth);
        User user = userRepo.findByEmail(req.getEmail()).orElseThrow();
        return new AuthResponse(token, user.getId(), user.getFullName(),
            user.getEmail(), user.getRole().name(), user.getLevel(), user.getXp(), user.getStreak());
    }

    public AuthResponse register(RegisterRequest req) {
        if (userRepo.existsByEmail(req.getEmail()))
            throw new RuntimeException("Email already in use: " + req.getEmail());

        User.Role assignedRole = User.Role.STUDENT;
        if (req.getRole() != null) {
            try {
                assignedRole = User.Role.valueOf(req.getRole().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        User user = User.builder()
            .firstName(req.getFirstName())
            .lastName(req.getLastName())
            .email(req.getEmail())
            .password(encoder.encode(req.getPassword()))
            .role(assignedRole)
            .build();
        userRepo.save(user);

        String token = jwtUtils.generateTokenFromEmail(user.getEmail());
        return new AuthResponse(token, user.getId(), user.getFullName(),
            user.getEmail(), user.getRole().name(), user.getLevel(), user.getXp(), user.getStreak());
    }

    public void forgotPassword(ForgotPasswordRequest req) {
        Optional<User> userOpt = userRepo.findByEmail(req.getEmail());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String token = UUID.randomUUID().toString();
            user.setResetToken(token);
            user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(15));
            userRepo.save(user);

            sendResetEmail(user.getEmail(), token);
        }
    }

    private void sendResetEmail(String email, String token) {
        if (mailSender == null) {
            System.out.println("JavaMailSender is not configured. Reset Link: http://localhost:4200/reset-password?token=" + token);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("Password Reset Request");
            message.setText("Click the following link to reset your password:\n" +
                    "http://localhost:4200/reset-password?token=" + token + "\n\n" +
                    "This link will expire in 15 minutes.");
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send email to " + email + ": " + e.getMessage());
            System.out.println("Mock Reset Link: http://localhost:4200/reset-password?token=" + token);
        }
    }

    public void resetPassword(ResetPasswordRequest req) {
        User user = userRepo.findByResetToken(req.getToken())
            .orElseThrow(() -> new RuntimeException("Invalid or expired password reset token"));

        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Invalid or expired password reset token");
        }

        user.setPassword(encoder.encode(req.getPassword()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepo.save(user);
    }
}
