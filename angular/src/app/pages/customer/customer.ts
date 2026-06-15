import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../models/models';

function emptyCustomer(): Customer {
  return { customerId: null, name: '', phone: '', address: '', location: '' };
}

@Component({
  selector: 'app-customer',
  imports: [FormsModule],
  templateUrl: './customer.html'
})
export class CustomerPage implements OnInit {
  private customerService = inject(CustomerService);

  customers = signal<Customer[]>([]);
  search = signal('');
  editing = signal<Customer | null>(null);
  isNew = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.customerService.list(this.search() || undefined).subscribe((list) => this.customers.set(list));
  }

  startCreate(): void {
    this.editing.set(emptyCustomer());
    this.isNew.set(true);
  }

  startEdit(customer: Customer): void {
    this.editing.set({ ...customer });
    this.isNew.set(false);
  }

  cancel(): void {
    this.editing.set(null);
  }

  updateField(field: keyof Customer, value: string): void {
    const current = this.editing();
    if (current) {
      this.editing.set({ ...current, [field]: value });
    }
  }

  save(): void {
    const customer = this.editing();
    if (!customer) {
      return;
    }
    const request = this.isNew()
      ? this.customerService.create(customer)
      : this.customerService.update(customer.customerId!, customer);
    request.subscribe(() => {
      this.editing.set(null);
      this.load();
    });
  }

  remove(customer: Customer): void {
    if (customer.customerId == null) {
      return;
    }
    this.customerService.delete(customer.customerId).subscribe(() => this.load());
  }
}
