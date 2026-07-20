package com.mrgostepz.bps.webservice.dto;

import lombok.Data;

import java.util.List;

@Data
public class UpdateOrderRequest {
    private String note;
    private String freezeMode;
    private String deliveryMode;
    private String orderDate;
    private String orderDetailJson;
    private List<OrderItemDto> items;
}
