package com.mrgostepz.bps.webservice.model;

import com.mrgostepz.bps.webservice.dto.OrderItemDto;
import java.util.List;
import lombok.Data;

@Data
public class LatestItem {
    private List<OrderItemDto> orderItem;
    private String note;

    public LatestItem() {

    }

    public LatestItem(List<OrderItemDto> orderItemDtos, String note) {
        this.orderItem = orderItemDtos;
        this.note = note;
    }
}
