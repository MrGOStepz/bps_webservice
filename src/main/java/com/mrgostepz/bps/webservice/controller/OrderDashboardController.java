package com.mrgostepz.bps.webservice.controller;

import com.mrgostepz.bps.webservice.dto.OrderCard;
import com.mrgostepz.bps.webservice.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Handles the Order Dashboard (weekly view + status changes) and the
 * Filter Search History page.
 */
@RestController
@RequestMapping("/api/dashboard")
public class OrderDashboardController {

    private final OrderService orderService;

    public OrderDashboardController(OrderService orderService) {
        this.orderService = orderService;
    }

    /**
     * Returns the orders for the 7-day window starting at {@code start}
     * (defaults to today).
     */
    @GetMapping("/week")
    public List<OrderCard> week(@RequestParam(required = false) String start) {
        LocalDate startDate = (start == null || start.isBlank()) ? LocalDate.now() : LocalDate.parse(start);
        LocalDate endDate = startDate.plusDays(6);
        return orderService.findByDateRange(startDate.toString(), endDate.toString());
    }

    @GetMapping("/search")
    public List<OrderCard> search(@RequestParam(required = false) Integer customerId,
                                  @RequestParam String startDate,
                                  @RequestParam String endDate) {
        return orderService.search(customerId, startDate, endDate);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OrderCard> updateStatus(@PathVariable Integer id,
                                                  @RequestBody Map<String, String> body) {
        return orderService.updateStatus(id, body.get("status"))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
