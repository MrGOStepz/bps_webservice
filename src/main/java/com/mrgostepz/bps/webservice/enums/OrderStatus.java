package com.mrgostepz.bps.webservice.enums;

public enum OrderStatus {
    PROCESSING("กำลังผลิต"),
    DONE("ผลิตเสร็จแล้ว"),
    DELIVERING("กำลังส่ง"),
    SHIPPED("จัดส่งแล้ว"),
    CANCELLED("ยกเลิก");

    private final String orderStatus;

    OrderStatus(String orderStatus) {
        this.orderStatus = orderStatus;
    }

    public String getOrderStatus() {
        return orderStatus;
    }
}
