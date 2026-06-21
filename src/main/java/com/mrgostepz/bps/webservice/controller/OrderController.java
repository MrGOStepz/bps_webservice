package com.mrgostepz.bps.webservice.controller;

import com.mrgostepz.bps.webservice.model.OrderEntity;
import com.mrgostepz.bps.webservice.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controller exposing order-level APIs.
 */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderEntity> updateStatus(@PathVariable Integer id,
                                                    @RequestBody Map<String, String> body) {
        return orderService.updateStatusEntity(id, body.get("status"))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}

