import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CustomerService, BuyerOrder } from '../../../services/customer.service';

@Component({
  selector: 'app-customer-orders',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css'
})
export class CustomerOrders {
  protected readonly customerService = inject(CustomerService);

  // Active tab: 'active' | 'history'
  activeTab = signal<'active' | 'history'>('active');
  selectedOrderId = signal<number | null>(null);

  ngOnInit(): void {
    // If there are orders, pre-select the first one by default
    const activeOrders = this.getActiveOrders();
    if (activeOrders.length > 0) {
      this.selectedOrderId.set(activeOrders[0].id);
    } else if (this.customerService.orders().length > 0) {
      this.selectedOrderId.set(this.customerService.orders()[0].id);
    }
  }

  getActiveOrders(): BuyerOrder[] {
    return this.customerService.orders().filter(o => 
      o.estado !== 'ENTREGADO' && o.estado !== 'CANCELADO'
    );
  }

  getHistoricOrders(): BuyerOrder[] {
    return this.customerService.orders().filter(o => 
      o.estado === 'ENTREGADO' || o.estado === 'CANCELADO'
    );
  }

  selectOrder(id: number): void {
    this.selectedOrderId.set(id);
  }

  getSelectedOrder(): BuyerOrder | undefined {
    return this.customerService.orders().find(o => o.id === this.selectedOrderId());
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'status-pending';
      case 'PAGADO': return 'status-paid';
      case 'PROCESANDO': return 'status-processing';
      case 'ENVIADO': return 'status-shipped';
      case 'ENTREGADO': return 'status-delivered';
      case 'CANCELADO': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDIENTE': return 'Pendiente de Pago';
      case 'PAGADO': return 'Pagado';
      case 'PROCESANDO': return 'Procesando';
      case 'ENVIADO': return 'Enviado (En Ruta)';
      case 'ENTREGADO': return 'Entregado';
      case 'CANCELADO': return 'Cancelado';
      default: return status;
    }
  }
}
