import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CustomerService, BuyerOrder } from '../../../services/customer.service';

@Component({
  selector: 'app-customer-account',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './account.html',
  styleUrl: './account.css'
})
export class CustomerAccount {
  protected readonly customerService = inject(CustomerService);

  // Computes active orders (not delivered and not cancelled)
  readonly activeOrders = computed(() => {
    return this.customerService.orders().filter(o => 
      o.estado !== 'ENTREGADO' && o.estado !== 'CANCELADO'
    );
  });

  // Computes completed orders count
  readonly completedOrdersCount = computed(() => {
    return this.customerService.orders().filter(o => 
      o.estado === 'ENTREGADO'
    ).length;
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
}
