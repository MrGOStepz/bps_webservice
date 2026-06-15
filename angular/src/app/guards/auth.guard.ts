import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

type Page = 'form' | 'dashboard' | 'history' | 'customer';

export function pageGuard(page: Page): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn()) {
      return router.createUrlTree(['/login']);
    }
    if (!auth.canAccess(page)) {
      return router.createUrlTree(['/dashboard']);
    }
    return true;
  };
}
