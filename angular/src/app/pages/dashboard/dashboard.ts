import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { OrderService } from '../../services/order.service';
import { WebSocketService } from '../../services/websocket.service';
import { OrderCard, OrderStatus, ORDER_STATUSES, StatusUpdate } from '../../models/models';

interface DayColumn {
  date: string;
  label: string;
  orders: OrderCard[];
}

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private orderService = inject(OrderService);
  private ws = inject(WebSocketService);
  private sub?: Subscription;

  readonly statuses = ORDER_STATUSES;
  private startDate = signal(new Date().toISOString().substring(0, 10));
  private orders = signal<OrderCard[]>([]);

  readonly columns = computed<DayColumn[]>(() => {
    const start = new Date(this.startDate());
    const cols: DayColumn[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const date = d.toISOString().substring(0, 10);
      cols.push({
        date,
        label: d.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        orders: this.orders().filter((o) => o.orderDate === date),
      });
    }
    return cols;
  });

  ngOnInit(): void {
    this.load();
    this.sub = this.ws.connect().subscribe((msg) => this.handleMessage(msg));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  load(): void {
    this.orderService.week(this.startDate()).subscribe((data) => this.orders.set(data));
  }

  private handleMessage(msg: unknown): void {
    const m = msg as Partial<OrderCard> & Partial<StatusUpdate>;
    if (m.id == null) {
      return;
    }
    const existing = this.orders().find((o) => o.id === m.id);
    if (existing && !('items' in m && m.items)) {
      // Status update only.
      this.orders.update((list) =>
        list.map((o) => (o.id === m.id ? { ...o, status: m.status as OrderStatus } : o)),
      );
    } else if ('items' in m && m.items) {
      // Full new/updated order card.
      const card = msg as OrderCard;
      this.orders.update((list) => {
        const others = list.filter((o) => o.id !== card.id);
        return [...others, card];
      });
    }
  }

  // changeStatus(order: OrderCard, status: OrderStatus): void {
  //   if (order.status === status) {
  //     return;
  //   }
  //   this.orderService.updateStatus(order.id, status).subscribe();
  // }

  statusClass(status: OrderStatus): string {
    switch (status) {
      case 'กำลังผลิต':
        return 'bg-secondary';
      case 'ผลิตเสร็จแล้ว':
        return 'bg-warning text-dark';
      case 'กำลังส่ง':
        return 'bg-info text-dark';
      case 'จัดส่งแล้ว':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  }

  // Map a status to a bootstrap variant by index in the ORDER_STATUSES array.
  // 0 -> secondary (gray), 1 -> warning (yellow), 2 -> info (blue), 3 -> success (green)
  private buttonVariant(status: OrderStatus): string {
    const idx = this.statuses.indexOf(status as any);
    switch (idx) {
      case 0:
        return 'secondary';
      case 1:
        return 'warning';
      case 2:
        return 'info';
      case 3:
        return 'success';
      default:
        return 'secondary';
    }
  }

  // Return the full class string for a status button for a given order.
  // Selected status -> filled variant (btn-{variant}), otherwise outline (btn-outline-{variant}).
  btnClass(order: OrderCard, status: OrderStatus): string {
    const variant = this.buttonVariant(status);
    const filled = order.status === status;
    let cls = `btn ${filled ? 'btn-' + variant : 'btn-outline-' + variant}`;
    // Ensure readable text color for some filled variants
    if (filled && (variant === 'warning' || variant === 'info')) {
      cls += ' text-dark';
    }
    return cls;
  }

  changeStatus(order: OrderCard, status: OrderStatus): void {
    if (order.status === status) {
      return;
    }

    const oldStatus = order.status;

    // Optimistic update: immediately update UI so user sees the change.
    this.orders.update((list) =>
      list.map((o) => (o.id === order.id ? { ...o, status } : o)),
    );

    // Send the update to server. On success, reconcile with server response (replace card).
    // On error, revert the optimistic change.
    this.orderService.updateStatus(order.id, status).subscribe({
      next: (card) => {
        // server may return the full OrderCard; replace local card with server copy
        this.orders.update((list) => {
          const others = list.filter((o) => o.id !== card.id);
          return [...others, card];
        });
      },
      error: () => {
        // revert to previous status on failure
        this.orders.update((list) =>
          list.map((o) => (o.id === order.id ? { ...o, status: oldStatus } : o)),
        );
      },
    });
  }

}
