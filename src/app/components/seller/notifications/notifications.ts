import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SellerService, SellerNotification } from '../../../services/seller.service';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { PaginationControlsComponent } from '../../../shared/pagination-controls/pagination-controls';

@Component({
  selector: 'app-seller-notifications',
  standalone: true,
  imports: [CommonModule, PaginatePipe, PaginationControlsComponent],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class SellerNotifications {
  protected readonly sellerService = inject(SellerService);
  private readonly router = inject(Router);

  readonly activeFilter = signal<'ALL' | 'PEDIDO' | 'PAGO' | 'CHAT' | 'SISTEMA'>('ALL');
  readonly currentPage = signal(1);
  readonly pageSize = 8;

  readonly filteredNotifications = computed(() => {
    let list = this.sellerService.notifications();
    const filterType = this.activeFilter();
    if (filterType !== 'ALL') {
      list = list.filter(n => n.tipo === filterType);
    }
    return list;
  });

  resetPage(): void {
    this.currentPage.set(1);
  }

  markRead(id: number): void {
    this.sellerService.markNotificationAsRead(id);
  }

  markAllRead(): void {
    this.sellerService.markAllNotificationsAsRead();
  }

  openNotification(notification: SellerNotification): void {
    if (notification.tipo === 'CHAT') {
      const conversationId = this.resolveConversationIdFromNotification(notification);
      if (conversationId !== null) {
        this.router.navigate(['/seller/chat'], {
          queryParams: { conversationId }
        });
      } else {
        this.router.navigate(['/seller/chat']);
      }
    }

    this.markRead(notification.id);
  }

  private resolveConversationIdFromNotification(notification: SellerNotification): number | null {
    const title = String(notification.titulo ?? '').toLowerCase();
    const content = String(notification.contenido ?? '').toLowerCase();
    const conversations = this.sellerService.conversations();

    if (title.startsWith('nuevo mensaje de')) {
      const senderName = title.replace(/^nuevo mensaje de\s+/i, '').trim();
      const match = conversations.find(conv =>
        conv.compradorNombre.toLowerCase() === senderName ||
        conv.compradorCorreo.toLowerCase().includes(senderName) ||
        content.includes(conv.compradorNombre.toLowerCase())
      );
      return match?.id ?? null;
    }

    if (title.startsWith('respuesta de')) {
      const storeName = title.replace(/^respuesta de\s+/i, '').trim();
      const match = conversations.find(conv =>
        conv.compradorNombre.toLowerCase() === storeName ||
        conv.compradorCorreo.toLowerCase().includes(storeName)
      );
      return match?.id ?? null;
    }

    return null;
  }
}
