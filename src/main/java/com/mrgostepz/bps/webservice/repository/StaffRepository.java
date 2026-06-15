package com.mrgostepz.bps.webservice.repository;

import com.mrgostepz.bps.webservice.model.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StaffRepository extends JpaRepository<Staff, Integer> {

    Optional<Staff> findFirstByPassword(String password);

    long countByRole(String role);
}
