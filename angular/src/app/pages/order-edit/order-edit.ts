import { Component, Input, Output, EventEmitter, inject, signal, effect, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { OrderCard, OrderItem, UpdateOrderRequest } from '../../models/models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-order-edit',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './order-edit.html',
  styleUrls: ['./order-edit.scss']
})
export class OrderEditComponent implements OnInit {
  @Input() order: OrderCard | null = null;
  @Output() saved = new EventEmitter<OrderCard>();
  @Output() cancelled = new EventEmitter<void>();

  private orderService = inject(OrderService);

  note = signal('');
  freezeMode = signal('');
  deliveryMode = signal('');
  orderDate = signal('');
  items = signal<OrderItem[]>([]);
  message = signal<string | null>(null);
  saving = signal(false);

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    if (this.order) {
      console.debug('Initializing form with order:', this.order.orderId);
      this.note.set(this.order.note ?? '');
      this.freezeMode.set(this.order.freezeMode ?? '');
      this.deliveryMode.set(this.order.deliveryMode ?? '');
      this.orderDate.set(this.order.orderDate ?? '');
      this.items.set([...(this.order.items ?? [])]);
    }
  }

  addItem(): void {
    this.items.update(items => [...items, { name: '', quantity: '1' }]);
  }

  removeItem(index: number): void {
    this.items.update(items => items.filter((_, i) => i !== index));
  }

  updateItemName(index: number, name: string): void {
    this.items.update(items => {
      const updated = [...items];
      updated[index] = { ...updated[index], name };
      return updated;
    });
  }

  updateItemQuantity(index: number, quantity: string): void {
    this.items.update(items => {
      const updated = [...items];
      updated[index] = { ...updated[index], quantity };
      return updated;
    });
  }

  submit(): void {
    if (!this.order?.id) {
      this.message.set('Order not found');
      console.error('Submit failed: order ID missing');
      return;
    }

    const request: UpdateOrderRequest = {
      note: this.note(),
      freezeMode: this.freezeMode(),
      deliveryMode: this.deliveryMode(),
      orderDate: this.orderDate(),
      items: this.items()
    };

    console.debug('Submitting order update:', { orderId: this.order.id, request });
    this.saving.set(true);
    this.orderService.updateOrder(this.order.id, request).subscribe({
      next: (updated) => {
        console.debug('Order updated successfully:', updated);
        this.message.set('Order updated successfully');
        this.saving.set(false);
        setTimeout(() => this.saved.emit(updated), 500);
      },
      error: (err) => {
        console.error('Error updating order:', err);
        this.message.set(err.error?.error ?? 'Failed to update order');
        this.saving.set(false);
      }
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
