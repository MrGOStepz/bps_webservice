package com.mrgostepz.bps.webservice.enums;

public enum BpsPermission {
    ADMIN("admin"),
    SALE("sale"),
    STAFF("staff"),
    DELIVERY("delivery"),
    CUSTOMER("customer");

    private final String bpsPermission;

    BpsPermission(String bpsPermission) {
        this.bpsPermission = bpsPermission;
    }

    public String getBpsPermission() {
        return bpsPermission;
    }
}
