import { Component, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { OrderCard } from '../../models/models';
import { OrderEditComponent } from './order-edit';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-order-edit-page',
  standalone: true,
  imports: [OrderEditComponent, CommonModule],
  templateUrl: './order-edit-page.html',
  styleUrls: ['./order-edit-page.scss']
})
export class OrderEditPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);

  order = signal<OrderCard | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const orderId = this.route.snapshot.paramMap.get('id');
      if (orderId) {
        this.loadOrder(parseInt(orderId));
      } else {
        this.error.set('Order ID not found');
        this.loading.set(false);
      }
    });
  }

  loadOrder(id: number): void {
    // Since there's no getOrder endpoint, we'll need to search or load from week view
    // For now, we'll use the search endpoint with a wide date range
    const today = new Date();
    const startDate = new Date(today.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    this.orderService.search(startDate, endDate).subscribe({
      next: (orders) => {
        const found = orders.find(o => o.orderId === id);
        if (found) {
          this.order.set(found);
        } else {
          this.error.set('Order not found');
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading order:', err);
        this.error.set('Failed to load order');
        this.loading.set(false);
      }
    });
  }

  onSaved(updated: OrderCard): void {
    // Redirect back to dashboard after successful update
    setTimeout(() => this.router.navigate(['/dashboard']), 1000);
  }

  onCancelled(): void {
    this.router.navigate(['/dashboard']);
  }
}
