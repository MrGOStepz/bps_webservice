package com.mrgostepz.bps.webservice.repository;

import com.mrgostepz.bps.webservice.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Integer> {

    List<Customer> findByNameContainingIgnoreCase(String name);
}
