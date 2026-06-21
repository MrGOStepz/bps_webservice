package com.mrgostepz.bps.webservice.dto;

import lombok.Data;

import java.util.List;

@Data
public class OrderRequest {
    private Integer customerId;
    private String deliveryAddress;
    private String location;
    private String note;
    private String orderDate;
    private String freezeMode;
    private String deliveryMode;
    private List<OrderItemDto> items;
}
