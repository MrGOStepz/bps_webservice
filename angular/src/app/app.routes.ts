import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Shell } from './pages/shell/shell';
import { Dashboard } from './pages/dashboard/dashboard';
import { FormPage } from './pages/form/form';
import { History } from './pages/history/history';
import { CustomerPage } from './pages/customer/customer';
import { pageGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard },
  { path: 'form', component: FormPage },
  { path: 'history', component: History },
  { path: 'customer', component: CustomerPage },
  {
    path: '',
    component: Shell,
    children: [
      { path: 'dashboard', component: Dashboard, canActivate: [pageGuard('dashboard')] },
      { path: 'form', component: FormPage, canActivate: [pageGuard('form')] },
      { path: 'history', component: History, canActivate: [pageGuard('history')] },
      { path: 'customers', component: CustomerPage, canActivate: [pageGuard('customer')] },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
