package com.mrgostepz.bps.webservice.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mrgostepz.bps.webservice.dto.OrderCard;
import com.mrgostepz.bps.webservice.dto.OrderItemDto;
import com.mrgostepz.bps.webservice.dto.OrderRequest;
import com.mrgostepz.bps.webservice.dto.StatusUpdate;
import com.mrgostepz.bps.webservice.enums.OrderStatus;
import com.mrgostepz.bps.webservice.model.Customer;
import com.mrgostepz.bps.webservice.model.LatestItem;
import com.mrgostepz.bps.webservice.model.OrderEntity;
import com.mrgostepz.bps.webservice.repository.CustomerRepository;
import com.mrgostepz.bps.webservice.repository.OrderRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class OrderService {

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
        int number = totalItemsByOrderDate(request.getOrderDate()) + 1;
        OrderEntity order = new OrderEntity();
        order.setCustomerId(request.getCustomerId());
        order.setDeliveryAddress(request.getDeliveryAddress());
        order.setOrderDate(request.getOrderDate());

        // Build orderName in format ddMMyyyy-N where N is count of existing orders for the date + 1
        if (request.getOrderDate() != null) {
            String[] d = request.getOrderDate().split("-");
            String ddMMyyyy = request.getOrderDate().replace("-", "");
            if (d.length == 3) {
                ddMMyyyy = d[2] + d[1] + d[0];
            }
            order.setOrderName(ddMMyyyy + "-" + number);
        } else {
            order.setOrderName("");
        }

        order.setNote(request.getNote());
        order.setDeliveryMode(request.getDeliveryMode());
        order.setFreezeMode(request.getFreezeMode());
        order.setStatus(OrderStatus.PROCESSING.getOrderStatus());
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

    /**
     * Update order status and attach a delivery proof path (image/video) if provided.
     */
    public Optional<OrderCard> updateStatusWithFile(Integer id, String status, String proofPath) {
        return orderRepository.findById(id).map(order -> {
            order.setStatus(status);
            order.setDeliveryProofPath(proofPath);
            OrderEntity saved = orderRepository.save(order);
            messagingTemplate.convertAndSend(TOPIC_ORDERS, new StatusUpdate(saved.getOrderId(), saved.getStatus()));
            return toCard(saved);
        });
    }

    /**
     * Return the stored delivery proof path (if any) for an order.
     */
    public Optional<String> getDeliveryProofPath(Integer id) {
        return orderRepository.findById(id).map(OrderEntity::getDeliveryProofPath);
    }

    /**
     * Update order status and return the updated OrderEntity.
     * This is useful for API endpoints that need the raw entity rather than the dashboard card.
     */
    public Optional<OrderEntity> updateStatusEntity(Integer id, String status) {
        return orderRepository.findById(id).map(order -> {
            order.setStatus(status);
            OrderEntity saved = orderRepository.save(order);
            messagingTemplate.convertAndSend(TOPIC_ORDERS, new StatusUpdate(saved.getOrderId(), saved.getStatus()));
            return saved;
        });
    }

    public List<OrderCard> findByDateRange(String startDate, String endDate) {
        return orderRepository.findByOrderDateBetween(startDate, endDate).stream()
                .map(this::toCard)
                .toList();
    }

    /**
     * Return total count of items for a single orderDate (orderDate stored as String).
     */
    public int totalItemsByOrderDate(String orderDate) {
        List<OrderEntity> orders = orderRepository.findByOrderDate(orderDate);
        return orders.size();
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

    public LatestItem latestItems(Integer customerId) {
        List<OrderEntity> orders = orderRepository.findByCustomerId(customerId);
        if (orders.isEmpty()) {
            return new LatestItem();
        }
        OrderEntity latest = orders.get(orders.size() - 1);
        return parseLatestItems(latest.getOrderDetailJson());
    }

    private OrderCard toCard(OrderEntity order) {
        Customer customerName = customerRepository.findById(order.getCustomerId()).orElse(null);
        return new OrderCard(
                order.getOrderId(),
                order.getOrderName(),
                order.getCustomerId(),
                customerName == null ? "Unknown" : customerName.getName(),
                customerName == null ? "Unknown" : customerName.getPhone(),
                order.getDeliveryAddress(),
                order.getNote(),
                order.getFreezeMode(),
                order.getDeliveryMode(),
                order.getOrderDate(),
                order.getStatus(),
                order.getDeliveryProofPath(),
                order.getOrderDetailJson(),
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

    private LatestItem parseLatestItems(String json) {
        if (json == null || json.isBlank()) {
            return new LatestItem();
        }
        try {
            Map<String, Object> detail = objectMapper.readValue(json, new TypeReference<>() {});
            Object items = detail.get("items");
            if (items == null) {
                return new LatestItem();
            }
            List<OrderItemDto> orderItemDtos = objectMapper.convertValue(items, new TypeReference<List<OrderItemDto>>() {});
            return new LatestItem(orderItemDtos, (String) detail.get("note"));
        } catch (Exception e) {
            return new LatestItem();
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
            return "{+" + e.getMessage() + "}";
        }
    }
}
