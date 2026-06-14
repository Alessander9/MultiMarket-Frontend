import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CustomerService, BuyerOrder } from '../../../services/customer.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-customer-account',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './account.html',
  styleUrl: './account.css'
})
export class CustomerAccount {
  protected readonly customerService = inject(CustomerService);
  protected readonly authService = inject(AuthService);

  readonly userName = computed(() => this.customerService.profile().nombres);
  readonly userEmail = computed(() => this.customerService.profile().correo);
  readonly userPhoto = computed(() => this.customerService.profile().foto);
  readonly roles = computed(() => this.authService.currentUserRoles());
  readonly roleLabel = computed(() => this.roles().includes('COMPRADOR') ? 'Comprador' : 'Cliente');
  readonly roleHint = computed(() => this.roles().includes('COMPRADOR') ? 'Panel personal de compras' : 'Acceso restringido');
  readonly unreadAlerts = computed(() => this.customerService.unreadNotificationsCount() + this.customerService.unreadChatsCount());

  readonly activeOrders = computed(() => {
    return this.customerService.orders().filter(o => 
      o.estado !== 'ENTREGADO' && o.estado !== 'CANCELADO'
    );
  });

  readonly completedOrdersCount = computed(() => {
    return this.customerService.orders().filter(o => 
      o.estado === 'ENTREGADO'
    ).length;
  });

  readonly quickActions = computed(() => ([
    { label: 'Explorar catálogo', route: '/products', icon: 'search', desc: 'Descubre productos, tiendas y novedades.' },
    { label: 'Ver tiendas', route: '/stores', icon: 'storefront', desc: 'Accede a vendedores y abre chats.' },
    { label: 'Mi carrito', route: '/cart', icon: 'shopping_cart', desc: 'Revisa y finaliza tus compras.' },
    { label: 'Mis favoritos', route: '/favorites', icon: 'favorite', desc: 'Recupera tus productos guardados.' },
    { label: 'Mis pedidos', route: '/orders', icon: 'local_shipping', desc: 'Consulta estados y seguimiento.' },
    { label: 'Mis mensajes', route: '/chat', icon: 'chat', desc: 'Habla con tiendas y vendedores.' }
  ]));

  readonly accountInsights = computed(() => ([
    { label: 'Direcciones guardadas', value: this.customerService.addresses().length, icon: 'home_pin' },
    { label: 'Favoritos', value: this.customerService.favorites().length, icon: 'favorite' },
    { label: 'Conversaciones', value: this.customerService.conversations().length, icon: 'forum' },
    { label: 'Pedidos activos', value: this.activeOrders().length, icon: 'inventory_2' }
  ]));

  readonly recentActivity = computed(() => {
    const latestOrders = [...this.customerService.orders()].slice(0, 3);
    const latestConversations = [...this.customerService.conversations()].slice(0, 3);
    return {
      latestOrders,
      latestConversations
    };
  });

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'status-pending';
      case 'PAGADO': return 'status-paid';
      case 'PROCESANDO': return 'status-processing';
      case 'ENVIADO': return 'status-shipped';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'Pendiente';
      case 'PAGADO': return 'Pagado';
      case 'PROCESANDO': return 'Procesando';
      case 'ENVIADO': return 'En camino';
      default: return status;
    }
  }

  trackByRoute(_: number, item: { route: string }): string {
    return item.route;
  }
}
