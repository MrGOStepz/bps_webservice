import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject, Observable } from 'rxjs';

/**
 * Connects to the backend STOMP endpoint (/ws) and exposes order updates
 * published on /topic/orders. Active only in the browser (no-op during SSR).
 */
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private platformId = inject(PLATFORM_ID);
  private client?: Client;
  private readonly updates$ = new Subject<unknown>();

  connect(): Observable<unknown> {
    if (isPlatformBrowser(this.platformId) && !this.client) {
      this.client = new Client({
        webSocketFactory: () => new SockJS('/ws'),
        reconnectDelay: 5000,
        onConnect: () => {
          this.client?.subscribe('/topic/orders', (message: IMessage) => {
            try {
              this.updates$.next(JSON.parse(message.body));
            } catch {
              /* ignore malformed message */
            }
          });
        }
      });
      this.client.activate();
    }
    return this.updates$.asObservable();
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = undefined;
  }
}
