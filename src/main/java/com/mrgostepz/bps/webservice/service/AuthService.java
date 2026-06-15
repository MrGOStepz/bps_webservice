package com.mrgostepz.bps.webservice.service;

import com.mrgostepz.bps.webservice.dto.LoginRequest;
import com.mrgostepz.bps.webservice.dto.LoginResponse;
import com.mrgostepz.bps.webservice.repository.StaffRepository;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final StaffRepository staffRepository;

    public AuthService(StaffRepository staffRepository) {
        this.staffRepository = staffRepository;
    }

    public LoginResponse login(LoginRequest request) {
        if (request == null || request.getPassword() == null || request.getPassword().isBlank()) {
            return new LoginResponse(false, null, null, "Password is required");
        }
        return staffRepository.findFirstByPassword(request.getPassword())
                .map(staff -> new LoginResponse(true, staff.getRole(), staff.getName(), "OK"))
                .orElseGet(() -> new LoginResponse(false, null, null, "Invalid password"));
    }
}
