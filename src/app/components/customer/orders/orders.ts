import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CustomerService, BuyerPurchase } from '../../../services/customer.service';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { PaginationControlsComponent } from '../../../shared/pagination-controls/pagination-controls';

@Component({
  selector: 'app-customer-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, PaginatePipe, PaginationControlsComponent],
  templateUrl: './orders.html',
  styleUrl: './orders.css'
})
export class CustomerOrders {
  protected readonly customerService = inject(CustomerService);

  // Active tab: 'active' | 'history'
  activeTab = signal<'active' | 'history'>('active');
  selectedPurchaseId = signal<number | null>(null);
  readonly currentPage = signal(1);
  readonly pageSize = 5;
  readonly purchases = computed(() => this.customerService.purchases());

  ngOnInit(): void {
    const activePurchases = this.getActivePurchases();
    if (activePurchases.length > 0) {
      this.selectedPurchaseId.set(activePurchases[0].id);
    } else if (this.purchases().length > 0) {
      this.selectedPurchaseId.set(this.purchases()[0].id);
    }
  }

  getActivePurchases(): BuyerPurchase[] {
    return this.purchases().filter(p =>
      p.estadoGeneral !== 'ENTREGADO' && p.estadoGeneral !== 'CANCELADO'
    );
  }

  getHistoricPurchases(): BuyerPurchase[] {
    return this.purchases().filter(p =>
      p.estadoGeneral === 'ENTREGADO' || p.estadoGeneral === 'CANCELADO'
    );
  }

  selectPurchase(id: number): void {
    this.selectedPurchaseId.set(id);
  }

  changeTab(tab: 'active' | 'history'): void {
    this.activeTab.set(tab);
    const nextList = tab === 'active' ? this.getActivePurchases() : this.getHistoricPurchases();
    this.selectedPurchaseId.set(nextList[0]?.id || null);
    this.currentPage.set(1);
  }

  getSelectedPurchase(): BuyerPurchase | undefined {
    const purchases = this.purchases();
    if (purchases.length === 0) return undefined;

    const selectedId = this.selectedPurchaseId();
    const selected = purchases.find(p => p.id === selectedId);
    if (selected) return selected;

    const activePurchases = this.getActivePurchases();
    return activePurchases[0] ?? purchases[0];
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

  exportReceipt(purchaseId: number): void {
    this.customerService.exportPurchasePdf(purchaseId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        try {
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `boleta-compra-${purchaseId}.pdf`;
          anchor.click();
        } finally {
          window.URL.revokeObjectURL(url);
        }
      },
      error: () => {
        console.error(`No se pudo descargar la boleta PDF de la compra ${purchaseId}.`);
      }
    });
  }
}
