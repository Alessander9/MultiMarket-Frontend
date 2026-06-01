import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Productos } from './components/productos/productos';
import { Dashboard } from './components/admin/dashboard/dashboard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'productos', component: Productos },
  { path: 'admin/dashboard', component: Dashboard },
  { path: 'admin/users', component: Dashboard },
  { path: 'admin/roles', component: Dashboard },
  { path: 'admin/vendors', component: Dashboard },
  { path: 'admin/categories', component: Dashboard },
  { path: 'admin/products', component: Dashboard },
  { path: 'admin/inventory', component: Dashboard },
  { path: 'admin/orders', component: Dashboard },
  { path: 'admin/payments', component: Dashboard },
  { path: 'admin/chats', component: Dashboard },
  { path: 'admin/notifications', component: Dashboard },
  { path: 'admin/imports', component: Dashboard },
  { path: 'admin/exports', component: Dashboard },
  { path: 'admin/kafka', component: Dashboard },
  { path: 'admin/logs', component: Dashboard },
  { path: 'admin/services', component: Dashboard },
  { path: 'admin/settings', component: Dashboard },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];

