import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
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
  // Angular expects `styleUrls` (plural)
  styleUrls: ['./dashboard.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit, OnDestroy {
  private orderService = inject(OrderService);
  private ws = inject(WebSocketService);
  private sub?: Subscription;

  readonly statuses = ORDER_STATUSES;
  private startDate = signal(new Date().toISOString().substring(0, 10));
  private orders = signal<OrderCard[]>([]);
  // Track pending status updates per-order so we can disable controls while an
  // update is in-flight and show a small spinner.
  private pending = signal<Record<number, boolean>>({});

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
    const m = msg as any;
    // Normalize id (server may send `id` for StatusUpdate or `orderId` for OrderCard)
    const id = m.id ?? m.orderId;
    if (id == null) {
      return;
    }

    // Skip websocket updates for orders that have a pending API call
    const p = this.pending();
    if (p[id]) {
      return;
    }

    const existing = this.orders().find((o) => o.id === id);
    if (!existing) {
      return; // Order doesn't exist locally, ignore message
    }

    if (!('items' in m && m.items)) {
      // Status update only - update only the matching order
      this.orders.update((list) => {
        const index = list.findIndex((o) => o.id === id);
        if (index === -1) return list;
        const updated = [...list];
        updated[index] = { ...updated[index], status: m.status as OrderStatus };
        return updated;
      });
    } else {
      // Full card - map fields and replace the matching order
      const card: OrderCard = {
        id,
        orderId: id,
        customerId: m.customerId,
        customerName: m.customerName,
        deliveryAddress: m.deliveryAddress,
        orderDate: m.orderDate,
        status: m.status as OrderStatus,
        items: m.items || [],
      };
      this.orders.update((list) => {
        const index = list.findIndex((o) => o.id === card.id);
        if (index === -1) return list;
        const updated = [...list];
        updated[index] = card;
        return updated;
      });
    }
  }

  pendingFor(id?: number): boolean {
    if (id == null) return false;
    const p = this.pending();
    return !!p[id];
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
    const orderId = order.orderId;

    // Optimistic update: immediately update UI so user sees the change.
    this.orders.update((list) =>
      list.map((o) => (o.id === orderId ? { ...o, status } : o)),
    );

    // Mark pending so controls are disabled until the request finishes.
    this.pending.update((m) => ({ ...m, [orderId]: true }));

    // Send the update to server. On success, update with server response.
    // On error, revert the optimistic change.
    this.orderService.updateStatus(orderId, status).subscribe({
      next: (card) => {
        // Update orders with the server response to ensure consistency
        this.orders.update((list) =>
          list.map((o) => (o.id === card.id ? card : o)),
        );
        this.pending.update((m) => {
          const copy = { ...m };
          delete copy[orderId];
          return copy;
        });
      },
      error: () => {
        // revert to previous status on failure
        this.orders.update((list) =>
          list.map((o) => (o.id === orderId ? { ...o, status: oldStatus } : o)),
        );
        this.pending.update((m) => {
          const copy = { ...m };
          delete copy[orderId];
          return copy;
        });
      },
    });
  }

}
