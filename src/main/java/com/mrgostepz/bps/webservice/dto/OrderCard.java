package com.mrgostepz.bps.webservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * View model used by the Order Dashboard cards and Search History table.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderCard {
    private Integer orderId;
    private String orderName;
    private Integer customerId;
    private String customerName;
    private String phone;
    private String deliveryAddress;
    private String note;
    private String freezeMode;
    private String deliveryMode;
    private String orderDate;
    private String status;
    private String imagePath;
    private String orderDetailJson;
    private List<OrderItemDto> items;
}
