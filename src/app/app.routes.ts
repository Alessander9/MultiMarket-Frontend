import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Productos } from './components/productos/productos';
import { Dashboard } from './components/admin/dashboard/dashboard';
import { SellerLayout } from './components/seller/seller-layout/seller-layout';
import { sellerGuard } from './guards/seller.guard';
import { CustomerLayout } from './components/customer/customer-layout/customer-layout';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'productos', component: Productos },
  { path: 'admin/dashboard', component: Dashboard },
  { path: 'admin/users', component: Dashboard },
  { path: 'admin/roles', component: Dashboard },
  { path: 'admin/vendors', component: Dashboard },
  { path: 'admin/stores', component: Dashboard },
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
  
  // ================= SELLER PORTAL NESTED ROUTES =================
  {
    path: 'seller',
    component: SellerLayout,
    canActivate: [sellerGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./components/seller/dashboard/dashboard').then(m => m.SellerDashboard) },
      { path: 'store', loadComponent: () => import('./components/seller/store/store').then(m => m.SellerStore) },
      { path: 'products', loadComponent: () => import('./components/seller/products/products').then(m => m.SellerProducts) },
      { path: 'inventory', loadComponent: () => import('./components/seller/inventory/inventory').then(m => m.SellerInventory) },
      { path: 'orders', loadComponent: () => import('./components/seller/orders/orders').then(m => m.SellerOrders) },
      { path: 'sales', loadComponent: () => import('./components/seller/sales/sales').then(m => m.SellerSales) },
      { path: 'customers', loadComponent: () => import('./components/seller/customers/customers').then(m => m.SellerCustomers) },
      { path: 'chat', loadComponent: () => import('./components/seller/chat/chat').then(m => m.SellerChat) },
      { path: 'imports', loadComponent: () => import('./components/seller/imports/imports').then(m => m.SellerImports) },
      { path: 'exports', loadComponent: () => import('./components/seller/exports/exports').then(m => m.SellerExports) },
      { path: 'payments', loadComponent: () => import('./components/seller/payments/payments').then(m => m.SellerPayments) },
      { path: 'notifications', loadComponent: () => import('./components/seller/notifications/notifications').then(m => m.SellerNotifications) },
      { path: 'settings', loadComponent: () => import('./components/seller/settings/settings').then(m => m.SellerSettingsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // ================= CUSTOMER PORTAL NESTED ROUTES =================
  {
    path: '',
    component: CustomerLayout,
    children: [
      { path: '', loadComponent: () => import('./components/customer/home/home').then(m => m.CustomerHome) },
      { path: 'products', loadComponent: () => import('./components/customer/products/products').then(m => m.CustomerProducts) },
      { path: 'products/:id', loadComponent: () => import('./components/customer/product-detail/product-detail').then(m => m.CustomerProductDetail) },
      { path: 'stores', loadComponent: () => import('./components/customer/stores/stores').then(m => m.CustomerStores) },
      { path: 'favorites', loadComponent: () => import('./components/customer/favorites/favorites').then(m => m.CustomerFavorites) },
      { path: 'cart', loadComponent: () => import('./components/customer/cart/cart').then(m => m.CustomerCart) },
      { path: 'checkout', loadComponent: () => import('./components/customer/checkout/checkout').then(m => m.CustomerCheckout) },
      { path: 'orders', loadComponent: () => import('./components/customer/orders/orders').then(m => m.CustomerOrders) },
      { path: 'chat', loadComponent: () => import('./components/customer/chat/chat').then(m => m.CustomerChat) },
      { path: 'notifications', loadComponent: () => import('./components/customer/notifications/notifications').then(m => m.CustomerNotifications) },
      { path: 'profile', loadComponent: () => import('./components/customer/profile/profile').then(m => m.CustomerProfile) },
      { path: 'account', loadComponent: () => import('./components/customer/account/account').then(m => m.CustomerAccount) }
    ]
  },

  { path: '**', redirectTo: '' }
];

