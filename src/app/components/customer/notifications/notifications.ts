import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CustomerService, BuyerNotification } from '../../../services/customer.service';

@Component({
  selector: 'app-customer-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class CustomerNotifications {
  protected readonly customerService = inject(CustomerService);

  markAllAsRead(): void {
    this.customerService.markNotificationsRead();
  }

  deleteNotification(id: number, event: Event): void {
    event.stopPropagation(); // Avoid triggering list row click
    this.customerService.deleteNotification(id);
  }

  toggleNotificationRead(notif: BuyerNotification): void {
    this.customerService.notifications.update(list => list.map(n => {
      if (n.id === notif.id) {
        return { ...n, leido: !n.leido };
      }
      return n;
    }));
  }

  getIcon(tipo: string): string {
    switch (tipo) {
      case 'PEDIDO': return 'local_shipping';
      case 'PAGO': return 'payments';
      case 'CHAT': return 'chat';
      case 'SISTEMA': return 'settings';
      case 'PROMOCION': return 'campaign';
      default: return 'notifications';
    }
  }

  getIconClass(tipo: string): string {
    switch (tipo) {
      case 'PEDIDO': return 'icon-pedidos';
      case 'PAGO': return 'icon-pagos';
      case 'CHAT': return 'icon-chat';
      case 'SISTEMA': return 'icon-sistema';
      case 'PROMOCION': return 'icon-promocion';
      default: return '';
    }
  }
}
