package com.mrgostepz.bps.webservice.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "orders")
public class OrderEntity {

    @Id
    @Column(name = "order_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer orderId;

    @Column(name = "customer_id")
    private Integer customerId;

    @Lob
    @Column(name = "order_detail_json")
    private String orderDetailJson;

    @Column(name = "delivery_address")
    private String deliveryAddress;

    @Column(name = "note")
    private String note;

    @Column(name = "order_date")
    private String orderDate;

    @Column(name = "status")
    private String status;

    @Column(name = "delivery_mode")
    private String deliveryMode;

    @Column(name = "freeze_mode")
    private String freezeMode;

    // Path to uploaded delivery proof (image or video)
    @Column(name = "delivery_proof_path")
    private String deliveryProofPath;
}
