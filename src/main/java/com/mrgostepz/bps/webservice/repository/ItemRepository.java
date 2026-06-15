package com.mrgostepz.bps.webservice.repository;

import com.mrgostepz.bps.webservice.model.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItemRepository extends JpaRepository<Item, Integer> {
}
