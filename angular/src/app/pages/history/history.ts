import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../services/customer.service';
import { OrderService } from '../../services/order.service';
import { Customer, OrderCard } from '../../models/models';

@Component({
  selector: 'app-history',
  imports: [FormsModule],
  templateUrl: './history.html'
})
export class History implements OnInit {
  private customerService = inject(CustomerService);
  private orderService = inject(OrderService);

  customers = signal<Customer[]>([]);
  customerId = signal<number | null>(null);
  startDate = signal('');
  endDate = signal('');
  results = signal<OrderCard[]>([]);
  searched = signal(false);

  ngOnInit(): void {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    this.endDate.set(today.toISOString().substring(0, 10));
    this.startDate.set(weekAgo.toISOString().substring(0, 10));
    this.customerService.list().subscribe((list) => this.customers.set(list));
  }

  search(): void {
    this.orderService
      .search(this.startDate(), this.endDate(), this.customerId() ?? undefined)
      .subscribe((data) => {
        this.results.set(data);
        this.searched.set(true);
      });
  }
}
