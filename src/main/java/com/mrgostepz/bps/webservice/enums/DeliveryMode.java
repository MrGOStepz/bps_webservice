package com.mrgostepz.bps.webservice.enums;

public enum DeliveryMode {
    PICKUP("ส่งเอง"),
    POST("ขนส่ง");

    private final String deliveryMode;

    DeliveryMode(String deliveryMode) {
        this.deliveryMode = deliveryMode;
    }

    public String getDeliveryMode() {
        return deliveryMode;
    }
}
