import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SellerService, SellerOrder } from '../../../services/seller.service';

@Component({
  selector: 'app-seller-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css'
})
export class SellerOrders implements OnInit {
  protected readonly sellerService = inject(SellerService);

  // Active view: 'list' | 'detail'
  readonly viewState = signal<'list' | 'detail'>('list');
  readonly selectedOrder = signal<SellerOrder | null>(null);
  readonly deleteConfirm = signal<{ id: number; message: string } | null>(null);

  // local states
  readonly isLoading = signal(false);
  readonly feedback = signal<string | null>(null);

  // Filters
  readonly searchFilter = signal('');
  readonly statusFilter = signal('ALL');

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
    }, 450);
  }

  // --- FILTERS & COMPUTED ---

  readonly filteredOrders = computed(() => {
    let list = this.sellerService.orders();

    // 1. Status Filter
    const status = this.statusFilter();
    if (status !== 'ALL') {
      list = list.filter(o => o.estado === status);
    }

    // 2. Search
    const q = this.searchFilter().trim().toLowerCase();
    if (q) {
      list = list.filter(o => 
        o.numeroPedido.toLowerCase().includes(q) || 
        o.clienteNombre.toLowerCase().includes(q) || 
        o.clienteCorreo.toLowerCase().includes(q)
      );
    }

    return list;
  });

  // --- ACTIONS ---

  openDetail(order: SellerOrder): void {
    this.selectedOrder.set(order);
    this.viewState.set('detail');
  }

  closeDetail(): void {
    this.selectedOrder.set(null);
    this.viewState.set('list');
  }

  updateStatus(orderId: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const nextStatus = select.value as any;
    
    this.isLoading.set(true);
    this.sellerService.updateOrderStatus(orderId, nextStatus).subscribe({
      next: (updatedOrder) => {
        this.isLoading.set(false);
        this.selectedOrder.set(updatedOrder);
        this.showToast(`Pedido ${updatedOrder.numeroPedido} actualizado a ${nextStatus}.`);
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('No se pudo actualizar el estado del pedido.');
      }
    });
  }

  cancelOrder(orderId: number): void {
    this.deleteConfirm.set({
      id: orderId,
      message: '¿Está seguro de que desea cancelar este pedido? Se retornará el stock correspondiente a los productos de esta transacción.'
    });
  }

  confirmCancel(): void {
    const data = this.deleteConfirm();
    if (!data) return;

    this.deleteConfirm.set(null);
    this.isLoading.set(true);
    this.sellerService.updateOrderStatus(data.id, 'CANCELADO').subscribe({
      next: (updatedOrder) => {
        this.isLoading.set(false);
        this.selectedOrder.set(updatedOrder);
        this.showToast('Pedido cancelado con éxito. Stock retornado.');
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('No se pudo cancelar el pedido.');
      }
    });
  }

  printInvoiceMock(): void {
    window.print();
  }

  private showToast(text: string): void {
    this.feedback.set(text);
    setTimeout(() => {
      this.feedback.set(null);
    }, 3000);
  }
}
