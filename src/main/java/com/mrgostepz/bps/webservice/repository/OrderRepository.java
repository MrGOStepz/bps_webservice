package com.mrgostepz.bps.webservice.repository;

import com.mrgostepz.bps.webservice.model.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, Integer> {

    List<OrderEntity> findByOrderDateBetween(String startDate, String endDate);

    List<OrderEntity> findByOrderDateBetweenAndIsActiveTrue(String startDate, String endDate);

    List<OrderEntity> findByCustomerIdAndOrderDateBetweenAndIsActiveTrue(Integer customerId, String startDate, String endDate);

    List<OrderEntity> findByCustomerIdAndIsActiveTrue(Integer customerId);

    // Find orders by a single orderDate (stored as String)
    List<OrderEntity> findByOrderDate(String orderDate);

    // Find the maximum OrderId
    @Query("SELECT MAX(o.orderId) FROM OrderEntity o")
    Optional<Integer> findMaxOrderId();
}
