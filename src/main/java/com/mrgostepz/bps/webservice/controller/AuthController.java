package com.mrgostepz.bps.webservice.controller;

import com.mrgostepz.bps.webservice.dto.LoginRequest;
import com.mrgostepz.bps.webservice.dto.LoginResponse;
import com.mrgostepz.bps.webservice.service.AuthService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request, HttpSession session) {
        LoginResponse response = authService.login(request);
        if (response.isSuccess()) {
            // Store role in session for use in protected endpoints
            session.setAttribute("role", response.getRole());
            session.setAttribute("name", response.getName());
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(401).body(response);
    }
}
