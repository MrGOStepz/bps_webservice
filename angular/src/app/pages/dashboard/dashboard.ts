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
  styleUrl: './dashboard.scss'
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
        label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        orders: this.orders().filter((o) => o.orderDate === date)
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
        list.map((o) => (o.id === m.id ? { ...o, status: m.status as OrderStatus } : o))
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

  changeStatus(order: OrderCard, status: OrderStatus): void {
    if (order.status === status) {
      return;
    }
    this.orderService.updateStatus(order.id, status).subscribe();
  }

  statusClass(status: OrderStatus): string {
    switch (status) {
      case 'NEW':
        return 'bg-secondary';
      case 'PREPARING':
        return 'bg-warning text-dark';
      case 'DELIVERING':
        return 'bg-info text-dark';
      case 'DONE':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  }
}
