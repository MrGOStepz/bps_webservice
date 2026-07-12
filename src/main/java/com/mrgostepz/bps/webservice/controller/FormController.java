package com.mrgostepz.bps.webservice.controller;

import com.mrgostepz.bps.webservice.dto.OrderRequest;
import com.mrgostepz.bps.webservice.model.LatestItem;
import com.mrgostepz.bps.webservice.model.OrderEntity;
import com.mrgostepz.bps.webservice.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


/**
 * Handles the Form Page: creating ORDER records and retrieving the latest
 * items previously ordered by a customer.
 */
@RestController
@RequestMapping("/api/form")
public class FormController {

    private final OrderService orderService;

    public FormController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping("/order")
    public ResponseEntity<OrderEntity> createOrder(@RequestBody OrderRequest request) {
        return ResponseEntity.ok(orderService.createOrder(request));
    }

    @GetMapping("/latest-items")
    public LatestItem latestItems(@RequestParam Integer customerId) {
        return orderService.latestItems(customerId);
    }
}
