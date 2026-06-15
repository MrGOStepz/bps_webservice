package com.mrgostepz.bps.webservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload broadcast over STOMP topic /topic/orders when an order status changes.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StatusUpdate {
    private Integer id;
    private String status;
}
