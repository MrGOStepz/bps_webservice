import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { LatestItem, OrderCard, OrderItem, OrderRequest, OrderStatus, UpdateOrderRequest } from '../models/models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);

  // Emits newly created orders so UI can update without a full refresh
  public newOrder: Subject<OrderCard> = new Subject<OrderCard>();
  public newOrder$ = this.newOrder.asObservable();

  createOrder(request: OrderRequest): Observable<OrderCard> {
    return this.http.post<any>('/api/form/order', request).pipe(map((d) => this.toCard(d)));
  }

  latestItems(customerId: number): Observable<LatestItem> {
    const url = `/api/form/latest-items?customerId=${customerId}`;
    console.log('Calling URL:', url);
    return this.http.get<any>(url).pipe(
      map((response) => {
        console.log('Raw API Response:', JSON.stringify(response));
        console.log('Response keys:', Object.keys(response));
        console.log('orderItem:', response?.orderItem);
        console.log('note:', response?.note);
        return {
          orderItem: response?.orderItem && Array.isArray(response.orderItem) ? response.orderItem : [],
          note: response?.note ? response.note : '',
        } as LatestItem;
      }),
    );
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
    return this.http
      .put<any>(`/api/dashboard/${id}/status`, { status })
      .pipe(map((d) => this.toCard(d)));
  }

  updateOrder(id: number, request: UpdateOrderRequest): Observable<OrderCard> {
    return this.http.put<any>(`/api/dashboard/${id}`, request).pipe(map((d) => this.toCard(d)));
  }

  deleteOrder(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`/api/dashboard/${id}`);
  }

  // Normalize server DTO shape -> frontend OrderCard
  private toCard(d: any): OrderCard {

    if (!d) {
      return {} as OrderCard;
    }

    // parse orderDetailJson (may be a string) and extract location
    const orderDetail = ((): any => {
      try {
        return typeof d?.orderDetailJson === 'string' ? JSON.parse(d.orderDetailJson) : (d?.orderDetailJson ?? {});
      } catch (e) {
        console.warn('Failed to parse orderDetailJson', e);
        return {};
      }
    })();

    const locations= orderDetail?.location ?? null;
    return {
      id: d.orderId ?? d.id,
      orderId: d.orderId ?? d.id,
      orderName: d.orderName ?? '',
      customerId: d.customerId,
      customerName: d.customerName,
      deliveryAddress: d.deliveryAddress,
      note: d.note,
      phone: d.phone,
      freezeMode: d.freezeMode,
      deliveryMode: d.deliveryMode,
      orderDate: d.orderDate,
      status: d.status,
      imagePath: d.imagePath ?? null,
      location: locations,
      items: d.items ?? [],
    };
  }
}
