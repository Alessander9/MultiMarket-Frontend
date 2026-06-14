import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CustomerService } from '../../../services/customer.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class CustomerDashboard {
  protected readonly customerService = inject(CustomerService);
  protected readonly authService = inject(AuthService);

  readonly profile = computed(() => this.customerService.profile());
  readonly activeOrders = computed(() => this.customerService.orders().filter(order => order.estado !== 'ENTREGADO' && order.estado !== 'CANCELADO'));
  readonly deliveredOrders = computed(() => this.customerService.orders().filter(order => order.estado === 'ENTREGADO'));
  readonly recentOrders = computed(() => [...this.customerService.orders()].slice(0, 3));
  readonly recentChats = computed(() => [...this.customerService.conversations()].slice(0, 3));
  readonly favoriteCount = computed(() => this.customerService.favorites().length);
  readonly addressCount = computed(() => this.customerService.addresses().length);
  readonly unreadChats = computed(() => this.customerService.unreadChatsCount());
  readonly unreadNotifications = computed(() => this.customerService.unreadNotificationsCount());
  readonly totalSpent = computed(() => this.customerService.orders().reduce((acc, order) => acc + Number(order.total || 0), 0));
  readonly quickLinks = [
    { label: 'Explorar catálogo', route: '/products', icon: 'search', desc: 'Busca productos y tiendas.' },
    { label: 'Tiendas', route: '/stores', icon: 'storefront', desc: 'Contacta vendedores y abre chats.' },
    { label: 'Pedidos', route: '/orders', icon: 'local_shipping', desc: 'Revisa estados y seguimiento.' },
    { label: 'Mensajes', route: '/chat', icon: 'chat', desc: 'Habla con tiendas y vendedores.' },
    { label: 'Favoritos', route: '/favorites', icon: 'favorite', desc: 'Recupera productos guardados.' },
    { label: 'Perfil', route: '/profile', icon: 'manage_accounts', desc: 'Edita tus datos y direcciones.' }
  ];

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'pending';
      case 'PAGADO': return 'paid';
      case 'PROCESANDO': return 'processing';
      case 'ENVIADO': return 'shipped';
      case 'ENTREGADO': return 'delivered';
      default: return '';
    }
  }
}
