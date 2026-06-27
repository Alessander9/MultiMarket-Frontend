import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CustomerService, BuyerNotification } from '../../../services/customer.service';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { PaginationControlsComponent } from '../../../shared/pagination-controls/pagination-controls';

@Component({
  selector: 'app-customer-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, PaginatePipe, PaginationControlsComponent],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class CustomerNotifications {
  protected readonly customerService = inject(CustomerService);
  private readonly router = inject(Router);
  readonly currentPage = signal(1);
  readonly pageSize = 8;

  markAllAsRead(): void {
    this.customerService.markNotificationsRead();
  }

  deleteNotification(id: number, event: Event): void {
    event.stopPropagation(); // Avoid triggering list row click
    this.customerService.deleteNotification(id);
  }

  toggleNotificationRead(notif: BuyerNotification): void {
    this.customerService.markNotificationRead(notif.id);
  }

  openNotification(notif: BuyerNotification): void {
    if (notif.tipo === 'CHAT') {
      const conversationId = this.customerService.resolveConversationIdFromNotification(notif);
      if (conversationId !== null) {
        this.router.navigate(['/chat'], {
          queryParams: { conversationId }
        });
      } else {
        this.router.navigate(['/chat']);
      }
    } else if (notif.tipo === 'PEDIDO') {
      this.router.navigate(['/orders']);
    }

    this.customerService.markNotificationRead(notif.id);
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

  resetPage(): void {
    this.currentPage.set(1);
  }
}
