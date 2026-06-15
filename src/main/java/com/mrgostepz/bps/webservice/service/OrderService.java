package com.mrgostepz.bps.webservice.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mrgostepz.bps.webservice.dto.OrderCard;
import com.mrgostepz.bps.webservice.dto.OrderItemDto;
import com.mrgostepz.bps.webservice.dto.OrderRequest;
import com.mrgostepz.bps.webservice.dto.StatusUpdate;
import com.mrgostepz.bps.webservice.model.Customer;
import com.mrgostepz.bps.webservice.model.OrderEntity;
import com.mrgostepz.bps.webservice.repository.CustomerRepository;
import com.mrgostepz.bps.webservice.repository.OrderRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class OrderService {

    private static final String DEFAULT_STATUS = "NEW";
    private static final String TOPIC_ORDERS = "/topic/orders";

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    public OrderService(OrderRepository orderRepository,
                        CustomerRepository customerRepository,
                        SimpMessagingTemplate messagingTemplate,
                        ObjectMapper objectMapper) {
        this.orderRepository = orderRepository;
        this.customerRepository = customerRepository;
        this.messagingTemplate = messagingTemplate;
        this.objectMapper = objectMapper;
    }

    public OrderEntity createOrder(OrderRequest request) {
        OrderEntity order = new OrderEntity();
        order.setCustomerId(request.getCustomerId());
        order.setDeliveryAddress(request.getDeliveryAddress());
        order.setOrderDate(request.getOrderDate());
        order.setStatus(DEFAULT_STATUS);
        order.setOrderDetailJson(writeDetailJson(request));
        OrderEntity saved = orderRepository.save(order);
        messagingTemplate.convertAndSend(TOPIC_ORDERS, toCard(saved));
        return saved;
    }

    public Optional<OrderCard> updateStatus(Integer id, String status) {
        return orderRepository.findById(id).map(order -> {
            order.setStatus(status);
            OrderEntity saved = orderRepository.save(order);
            messagingTemplate.convertAndSend(TOPIC_ORDERS, new StatusUpdate(saved.getOrderId(), saved.getStatus()));
            return toCard(saved);
        });
    }

    public List<OrderCard> findByDateRange(String startDate, String endDate) {
        return orderRepository.findByOrderDateBetween(startDate, endDate).stream()
                .map(this::toCard)
                .toList();
    }

    public List<OrderCard> search(Integer customerId, String startDate, String endDate) {
        List<OrderEntity> orders;
        if (customerId != null) {
            orders = orderRepository.findByCustomerIdAndOrderDateBetween(customerId, startDate, endDate);
        } else {
            orders = orderRepository.findByOrderDateBetween(startDate, endDate);
        }
        return orders.stream().map(this::toCard).toList();
    }

    public List<OrderItemDto> latestItems(Integer customerId) {
        List<OrderEntity> orders = orderRepository.findByCustomerId(customerId);
        if (orders.isEmpty()) {
            return List.of();
        }
        OrderEntity latest = orders.get(orders.size() - 1);
        return parseItems(latest.getOrderDetailJson());
    }

    private OrderCard toCard(OrderEntity order) {
        String customerName = customerRepository.findById(order.getCustomerId())
                .map(Customer::getName)
                .orElse("Unknown");
        return new OrderCard(
                order.getOrderId(),
                order.getCustomerId(),
                customerName,
                order.getDeliveryAddress(),
                order.getOrderDate(),
                order.getStatus(),
                parseItems(order.getOrderDetailJson())
        );
    }

    private List<OrderItemDto> parseItems(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        try {
            Map<String, Object> detail = objectMapper.readValue(json, new TypeReference<>() {});
            Object items = detail.get("items");
            if (items == null) {
                return new ArrayList<>();
            }
            return objectMapper.convertValue(items, new TypeReference<List<OrderItemDto>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private String writeDetailJson(OrderRequest request) {
        try {
            Map<String, Object> detail = Map.of(
                    "note", request.getNote() == null ? "" : request.getNote(),
                    "location", request.getLocation() == null ? "" : request.getLocation(),
                    "items", request.getItems() == null ? List.of() : request.getItems()
            );
            return objectMapper.writeValueAsString(detail);
        } catch (Exception e) {
            return "{}";
        }
    }
}
