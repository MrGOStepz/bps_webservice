package com.mrgostepz.bps.webservice.config;

import com.mrgostepz.bps.webservice.model.Customer;
import com.mrgostepz.bps.webservice.model.Item;
import com.mrgostepz.bps.webservice.model.Staff;
import com.mrgostepz.bps.webservice.repository.CustomerRepository;
import com.mrgostepz.bps.webservice.repository.ItemRepository;
import com.mrgostepz.bps.webservice.repository.StaffRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Seeds default staff accounts (one per role), sample customers and items
 * on first run so the application is usable out of the box.
 */
@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seedData(StaffRepository staffRepository,
                               CustomerRepository customerRepository,
                               ItemRepository itemRepository) {
        return args -> {
            if (staffRepository.count() == 0) {
                staffRepository.save(new Staff(null, "Administrator", "admin123", "ADMIN"));
                staffRepository.save(new Staff(null, "Sale User", "sale123", "SALE"));
                staffRepository.save(new Staff(null, "Staff User", "staff123", "STAFF"));
                staffRepository.save(new Staff(null, "Delivery User", "delivery123", "DELIVERY"));
            }
            if (customerRepository.count() == 0) {
                customerRepository.save(new Customer(null, "John Doe", "0800000001", "123 Main St", "13.7563,100.5018"));
                customerRepository.save(new Customer(null, "Jane Smith", "0800000002", "456 Park Ave", "13.7461,100.5340"));
            }
            if (itemRepository.count() == 0) {
                itemRepository.save(new Item(null, "Water Bottle", "1", "drink"));
                itemRepository.save(new Item(null, "Gas Tank", "1", "gas"));
            }
        };
    }
}
