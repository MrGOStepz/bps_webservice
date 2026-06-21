import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../services/customer.service';
import { OrderService } from '../../services/order.service';
import { Customer, OrderItem } from '../../models/models';

@Component({
  selector: 'app-form',
  imports: [FormsModule],
  templateUrl: './form.html',
})
export class FormPage implements OnInit {
  private customerService = inject(CustomerService);
  private orderService = inject(OrderService);

  customers = signal<Customer[]>([]);
  selectedCustomerId = signal<number | null>(null);
  address = signal('');
  search = signal('');
  location = signal('');
  phone = signal('');
  freezeMode = signal('ละลาย');
  deliveryMode = signal('ขนส่ง');
  note = signal('');
  items = signal<OrderItem[]>([{ name: '', quantity: '1' }]);
  message = signal<string | null>(null);
  saving = signal(false);

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.customerService
      .list(this.search() || undefined)
      .subscribe((list) => this.customers.set(list));
  }

  onCustomerChange(id: string): void {
    const customerId = id ? Number(id) : null;
    this.selectedCustomerId.set(customerId);
    const customer = this.customers().find((c) => c.customerId === customerId);
    if (customer) {
      this.address.set(customer.address);
      this.location.set(customer.location);
      this.phone.set(customer.phone);
    }
    if (customerId != null) {
      this.orderService.latestItems(customerId).subscribe((items) => {
        if (items.length > 0) {
          this.items.set(items.map((i) => ({ name: i.name, quantity: i.quantity })));
        }
      });
    }
  }

  addItem(): void {
    this.items.update((list) => [...list, { name: '', quantity: '1' }]);
  }

  removeItem(index: number): void {
    this.items.update((list) => list.filter((_, i) => i !== index));
  }

  updateItem(index: number, field: 'name' | 'quantity', value: string): void {
    this.items.update((list) =>
      list.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  submit(): void {
    this.message.set(null);
    const customerId = this.selectedCustomerId();
    if (customerId == null) {
      this.message.set('Please select a customer');
      return;
    }
    this.saving.set(true);
    this.orderService
      .createOrder({
        customerId,
        deliveryAddress: this.address(),
        location: this.location(),
        phone: this.phone(),
        freezeMode: this.freezeMode(),
        deliveryMode: this.deliveryMode(),
        note: this.note(),
        orderDate: new Date().toISOString().substring(0, 10),
        items: this.items().filter((i) => i.name.trim().length > 0),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.message.set('Order submitted successfully');
          this.address.set('');
          this.location.set('');
          this.phone.set('');
          this.deliveryMode.set('ขนส่ง');
          this.freezeMode.set('ละลาย');
          this.items.set([{ name: '', quantity: '1' }]);
          this.note.set('');
        },
        error: () => {
          this.saving.set(false);
          this.message.set('Failed to submit order');
        },
      });
  }
}
