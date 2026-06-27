import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { OrderService } from '../../services/order.service';
import { WebSocketService } from '../../services/websocket.service';
import { AuthService } from '../../services/auth.service';
import { OrderCard, OrderStatus, ORDER_STATUSES } from '../../models/models';

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
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private sub?: Subscription;
  private newOrderSub?: Subscription;

  readonly statuses = ORDER_STATUSES;
  private startDate = signal(new Date().toISOString().substring(0, 10));
  private orders = signal<OrderCard[]>([]);
  // Track pending status updates per-order so we can disable controls while an
  // update is in-flight and show a small spinner.
  private pending = signal<Record<number, boolean>>({});

  // Upload modal state (exposed to template)
  uploadModalVisible = signal(false);
  uploadOrderId = signal<number | null>(null);
  uploadFile = signal<File | null>(null);
  uploadPreviewUrl = signal<string | null>(null);

  // Viewer modal state (for displaying already-uploaded delivery proof)
  viewerModalVisible = signal(false);
  viewerImagePath = signal<string | null>(null);
  viewerError = signal<string | null>(null);

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
    // Also listen for orders created via the form so the dashboard updates without page refresh
    this.newOrderSub = this.orderService.newOrder$.subscribe((card) => this.addOrder(card));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.newOrderSub?.unsubscribe();
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
        // Preserve any existing imagePath unless the message includes a new one
        updated[index] = { ...updated[index], status: m.status as OrderStatus, imagePath: m.imagePath ?? m.image_path ?? updated[index].imagePath };
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
        note: m.note,
        phone: m.phone,
        freezeMode: m.freezeMode,
        deliveryMode: m.deliveryMode,
        status: m.status as OrderStatus,
        items: m.items || [],
        imagePath: m.imagePath ?? m.image_path ?? null,
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

  private addOrder(card: OrderCard): void {
    if (!card || !card.orderDate) return;
    const start = new Date(this.startDate()).toISOString().substring(0, 10);
    const end = new Date(new Date(this.startDate()).setDate(new Date(this.startDate()).getDate() + 6)).toISOString().substring(0, 10);
    const od = card.orderDate;
    if (od < start || od > end) return;
    this.orders.update((list) => {
      if (list.find((o) => o.id === card.id)) return list;
      return [...list, card];
    });
  }

  pendingFor(id?: number): boolean {
    if (id == null) return false;
    const p = this.pending();
    return p[id];
  }

  // Return whether the currently authenticated role is allowed to set the
  // given status. Mapping according to requirements:
  // - ADMIN, SALE: can set all statuses
  // - STAFF: can set first three statuses (not 'จัดส่งแล้ว')
  // - DELIVERY: can set only 'จัดส่งแล้ว'
  canSetStatus(status: OrderStatus): boolean {
    const role = this.auth.role();
    if (!role) return false;
    switch (role) {
      case 'ADMIN':
        return true;
      case 'STAFF':
        return status !== 'จัดส่งแล้ว';
      case 'DELIVERY':
        return status === 'จัดส่งแล้ว';
      default:
        return false;
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
    console.debug('changeStatus called', {
      orderId: order.id,
      current: order.status,
      target: status,
    });

    // If clicking the same status and it's 'จัดส่งแล้ว' with imagePath, show the proof
    if (order.status === status && order.imagePath) {
      // Use server endpoint to fetch the proof instead of attempting to load local file:// URL
      this.openViewerByOrderId(order.id);
      return;
    }

    if (order.status === status) {
      console.debug('changeStatus aborted: status unchanged');
      return;
    }

    // Disallow if current role cannot set the requested status
    if (!this.canSetStatus(status)) {
      return;
    }
    // If status is 'จัดส่งแล้ว' (delivered) require upload of proof file
    if (status === 'จัดส่งแล้ว') {
      console.debug('Opening upload modal for delivered status', { orderId: order.id });
      this.openUploadModal(order);
      return;
    }

    const oldStatus = order.status;
    const orderId = order.orderId;

    // Optimistic update: immediately update UI so user sees the change.
    this.orders.update((list) => list.map((o) => (o.id === orderId ? { ...o, status } : o)));

    // Mark pending so controls are disabled until the request finishes.
    this.pending.update((m) => ({ ...m, [orderId]: true }));

    // Send the update to server. On success, update with server response.
    // On error, revert the optimistic change.
    this.orderService.updateStatus(orderId, status).subscribe({
      next: (card) => {
        // Update orders with the server response to ensure consistency
        this.orders.update((list) => list.map((o) => (o.id === card.id ? card : o)));
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

  // Open the upload modal for a specific order
  private openUploadModal(order: OrderCard): void {
    this.uploadOrderId.set(order.id);
    this.uploadFile.set(null);
    this.uploadPreviewUrl.set(null);
    this.uploadModalVisible.set(true);
    console.debug('uploadModalVisible set to true');
  }

  // Close modal and cleanup preview URL
  closeUploadModal(): void {
    const url = this.uploadPreviewUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.uploadFile.set(null);
    this.uploadPreviewUrl.set(null);
    this.uploadOrderId.set(null);
    this.uploadModalVisible.set(false);
  }

  // Handle file input change
  onUploadFileChange(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    const prev = this.uploadPreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    if (file) {
      // If image, resize/compress before storing to reduce upload size.
      if (file.type.startsWith('image/')) {
        this.resizeImageFile(file, 1280, 0.8)
          .then((resized) => {
            const blob = resized ?? file;
            const url = URL.createObjectURL(blob);
            // Keep the original filename when possible
            const finalFile = resized ?? file;
            this.uploadFile.set(finalFile as File);
            this.uploadPreviewUrl.set(url);
          })
          .catch((err) => {
            console.debug('Image resize failed, falling back to original file', err);
            const url = URL.createObjectURL(file);
            this.uploadFile.set(file);
            this.uploadPreviewUrl.set(url);
          });
      } else {
        const url = URL.createObjectURL(file);
        this.uploadFile.set(file);
        this.uploadPreviewUrl.set(url);
      }
    } else {
      this.uploadFile.set(null);
      this.uploadPreviewUrl.set(null);
    }
  }

  // Resize an image File using canvas. Returns a new File (Blob) or null on failure.
  private resizeImageFile(file: File, maxDim = 1280, quality = 0.8): Promise<File | null> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const iw = img.naturalWidth;
          const ih = img.naturalHeight;
          let w = iw;
          let h = ih;
          if (maxDim > 0 && (iw > maxDim || ih > maxDim)) {
            if (iw > ih) {
              w = maxDim;
              h = Math.round((ih * maxDim) / iw);
            } else {
              h = maxDim;
              w = Math.round((iw * maxDim) / ih);
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              if (!blob) {
                resolve(null);
                return;
              }
              const newFile = new File([blob], file.name, { type: blob.type || 'image/jpeg' });
              resolve(newFile);
            },
            'image/jpeg',
            quality,
          );
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  // Upload selected file and set status to 'จัดส่งแล้ว'
  uploadConfirm(): void {
    const orderId = this.uploadOrderId();
    const file = this.uploadFile();
    if (orderId == null || !file) return;

    // mark pending
    this.pending.update((m) => ({ ...m, [orderId]: true }));

    const form = new FormData();
    form.append('status', 'จัดส่งแล้ว');
    form.append('file', file, file.name);

    this.http.put<any>(`/api/dashboard/${orderId}/status`, form).subscribe({
      next: (d) => {
        const card = this.orderService['toCard'] ? this.orderService['toCard'](d) : d;
        // Ensure we have an imagePath to view immediately after upload; if the
        // server does not return a URL we can fall back to the local preview URL
        // created by URL.createObjectURL(file). This only works for the current
        // browser session but allows immediate viewing.
        const effectiveCard = { ...card, imagePath: card.imagePath ?? card.image_path ?? this.uploadPreviewUrl() };
        // Update orders with server response (merged)
        this.orders.update((list) => list.map((o) => (o.id === effectiveCard.id ? effectiveCard : o)));
        // cleanup
        this.pending.update((m) => {
          const copy = { ...m };
          delete copy[orderId];
          return copy;
        });
        this.closeUploadModal();
      },
      error: () => {
        this.pending.update((m) => {
          const copy = { ...m };
          delete copy[orderId];
          return copy;
        });
        this.closeUploadModal();
      },
    });
  }

  // Open viewer modal to display delivery proof
  openViewerModal(imagePath: string | null): void {
    if (!imagePath) return;
    this.viewerError.set(null);
    this.viewerImagePath.set(imagePath);
    this.viewerModalVisible.set(true);
  }

  // Open viewer modal using server endpoint for the order's proof file
  openViewerByOrderId(orderId: number): void {
    this.viewerError.set(null);
    this.viewerImagePath.set(`/api/dashboard/${orderId}/proof`);
    this.viewerModalVisible.set(true);
  }

  // Close viewer modal
  closeViewerModal(): void {
    this.viewerImagePath.set(null);
    this.viewerModalVisible.set(false);
    this.viewerError.set(null);
  }
}
