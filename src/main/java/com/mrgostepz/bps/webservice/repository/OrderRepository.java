package com.mrgostepz.bps.webservice.repository;

import com.mrgostepz.bps.webservice.model.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, Integer> {

    List<OrderEntity> findByOrderDateBetween(String startDate, String endDate);

    List<OrderEntity> findByCustomerIdAndOrderDateBetween(Integer customerId, String startDate, String endDate);

    List<OrderEntity> findByCustomerId(Integer customerId);
}
