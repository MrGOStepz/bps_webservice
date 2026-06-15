import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.get<OrderCard[]>(url);
  }

  search(startDate: string, endDate: string, customerId?: number): Observable<OrderCard[]> {
    let url = `/api/dashboard/search?startDate=${startDate}&endDate=${endDate}`;
    if (customerId != null) {
      url += `&customerId=${customerId}`;
    }
    return this.http.get<OrderCard[]>(url);
  }

  updateStatus(id: number, status: OrderStatus): Observable<OrderCard> {
    return this.http.put<OrderCard>(`/api/dashboard/${id}/status`, { status });
  }
}
