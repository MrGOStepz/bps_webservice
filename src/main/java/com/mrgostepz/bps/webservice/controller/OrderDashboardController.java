package com.mrgostepz.bps.webservice.controller;

import com.mrgostepz.bps.webservice.dto.OrderCard;
import com.mrgostepz.bps.webservice.service.OrderService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
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

    @Value("${app.upload.path:uploads}")
    private String uploadPath;

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

    // Support multipart upload when setting status (e.g. attach an image/video when marking delivered)
    @PutMapping(value = "{id}/status", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<OrderCard> updateStatusWithFile(@PathVariable Integer id,
                                                          @RequestParam("status") String status,
                                                          @RequestPart(value = "file", required = false) MultipartFile file) {
        String savedPath = null;
        if (file != null && !file.isEmpty()) {
            try {
                String filename = System.currentTimeMillis() + "_" + file.getOriginalFilename();
                Path target = Paths.get(uploadPath).toAbsolutePath().normalize().resolve(filename);
                Files.createDirectories(target.getParent());
                try (InputStream in = file.getInputStream()) {
                    Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
                }
                savedPath = target.toString();
            } catch (Exception e) {
                return ResponseEntity.status(500).build();
            }
        }

        return orderService.updateStatusWithFile(id, status, savedPath)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Stream the delivery proof file for an order (if present).
     */
    @GetMapping("/{id}/proof")
    public ResponseEntity<Resource> getDeliveryProof(@PathVariable Integer id) {
        var opt = orderService.getDeliveryProofPath(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        String p = opt.get();
        try {
            Path file = Paths.get(p).toAbsolutePath().normalize();
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }
            String contentType = Files.probeContentType(file);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getFileName().toString() + "\"")
                    .header(HttpHeaders.CONTENT_TYPE, contentType == null ? "application/octet-stream" : contentType)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
}
