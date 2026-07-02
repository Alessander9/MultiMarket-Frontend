import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
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
}
