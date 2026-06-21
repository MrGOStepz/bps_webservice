import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { OrderCard, OrderItem, OrderRequest, OrderStatus } from '../models/models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);

  createOrder(request: OrderRequest): Observable<unknown> {
    return this.http.post('/api/form/order', request);
  }

  latestItems(customerId: number): Observable<OrderItem[]> {
    return this.http.get<OrderItem[]>(`/api/form/latest-items?customerId=${customerId}`);
  }

  week(start?: string): Observable<OrderCard[]> {
    const url = start ? `/api/dashboard/week?start=${start}` : '/api/dashboard/week';
    // Backend OrderCard DTO uses `orderId` property; normalize to frontend `id`.
    return this.http.get<any[]>(url).pipe(map((arr) => arr.map((d) => this.toCard(d))));
  }

  search(startDate: string, endDate: string, customerId?: number): Observable<OrderCard[]> {
    let url = `/api/dashboard/search?startDate=${startDate}&endDate=${endDate}`;
    if (customerId != null) {
      url += `&customerId=${customerId}`;
    }
    return this.http.get<any[]>(url).pipe(map((arr) => arr.map((d) => this.toCard(d))));
  }

  updateStatus(id: number, status: OrderStatus): Observable<OrderCard> {
    return this.http.put<any>(`/api/dashboard/${id}/status`, { status }).pipe(
      map((d) => this.toCard(d)),
    );
  }

  // Normalize server DTO shape -> frontend OrderCard
  private toCard(d: any): OrderCard {
    if (!d) {
      return {} as OrderCard;
    }
    return {
      id: d.orderId ?? d.id,
      orderId: d.orderId ?? d.id,
      customerId: d.customerId,
      customerName: d.customerName,
      deliveryAddress: d.deliveryAddress,
      orderDate: d.orderDate,
      status: d.status,
      imagePath: d.imagePath ?? null,
      items: d.items ?? [],
    } as OrderCard;
  }
}
