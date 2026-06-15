import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginResponse, Role } from '../models/models';

const STORAGE_KEY = 'bps_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  readonly role = signal<Role | null>(null);
  readonly name = signal<string | null>(null);
  readonly isLoggedIn = computed(() => this.role() !== null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          this.role.set(data.role);
          this.name.set(data.name);
        } catch {
          /* ignore corrupt storage */
        }
      }
    }
  }

  login(password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', { password }).pipe(
      tap((res) => {
        if (res.success && res.role) {
          this.role.set(res.role);
          this.name.set(res.name);
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ role: res.role, name: res.name }));
          }
        }
      })
    );
  }

  logout(): void {
    this.role.set(null);
    this.name.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  canAccess(page: 'form' | 'dashboard' | 'history' | 'customer'): boolean {
    const role = this.role();
    if (!role) {
      return false;
    }
    switch (page) {
      case 'form':
        return role === 'ADMIN' || role === 'SALE';
      case 'dashboard':
        return role === 'ADMIN' || role === 'SALE' || role === 'STAFF' || role === 'DELIVERY';
      case 'history':
        return role === 'ADMIN';
      case 'customer':
        return role === 'ADMIN';
      default:
        return false;
    }
  }
}
