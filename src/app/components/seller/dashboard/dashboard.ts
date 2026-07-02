import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { SellerService } from '../../../services/seller.service';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class SellerDashboard implements OnInit {
  protected readonly sellerService = inject(SellerService);
  private readonly router = inject(Router);

  // Component UI States
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  // Interactive local states
  readonly activeChartTab = signal<'sales' | 'orders'>('sales');
  
  // Highlighting selected items
  readonly selectedAlertFilter = signal<'ALL' | 'STOCK' | 'ORDERS' | 'CHAT'>('ALL');

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const dataLoad$ = this.sellerService.backendLoaded()
      ? of(void 0)
      : this.sellerService.loadBackendData();

    dataLoad$.subscribe({
      next: () => undefined,
      complete: () => {
        setTimeout(() => this.isLoading.set(false), 180);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los datos reales del vendedor.');
        this.isLoading.set(false);
      }
    });
  }

  // Quick Action: Ship order
  shipOrder(id: number): void {
    this.sellerService.updateOrderStatus(id, 'ENVIADO').subscribe({
      next: () => {
        console.log(`Pedido ${id} enviado con éxito.`);
      },
      error: (err) => {
        this.errorMessage.set('No se pudo actualizar el estado del pedido.');
      }
    });
  }

  // Quick Action: Cancel order
  cancelOrder(id: number): void {
    this.sellerService.updateOrderStatus(id, 'CANCELADO').subscribe({
      next: () => {
        console.log(`Pedido ${id} cancelado.`);
      },
      error: () => {
        this.errorMessage.set('No se pudo cancelar el pedido.');
      }
    });
  }

  // Get alerts list
  get filteredAlerts() {
    const lowStockCount = this.sellerService.lowStockProductsCount();
    const alerts = [
      lowStockCount > 0
        ? {
            id: 1,
            type: 'STOCK',
            title: 'Stock Bajo',
            message: `Tienes ${lowStockCount} productos con stock igual o menor al mínimo recomendado.`,
            severity: 'critical',
            actionRoute: '/seller/inventory',
            actionText: 'Ajustar Stock'
          }
        : null,
      this.sellerService.pendingOrdersCount() > 0
        ? {
            id: 2,
            type: 'ORDERS',
            title: 'Pedidos Pendientes',
            message: `Tienes ${this.sellerService.pendingOrdersCount()} pedidos esperando ser procesados.`,
            severity: 'warning',
            actionRoute: '/seller/orders',
            actionText: 'Ver Pedidos'
          }
        : null,
      this.sellerService.unreadChatsCount() > 0
        ? {
            id: 3,
            type: 'CHAT',
            title: 'Mensajes Sin Leer',
            message: `Hay ${this.sellerService.unreadChatsCount()} consultas de clientes sin responder.`,
            severity: 'info',
            actionRoute: '/seller/chat',
            actionText: 'Responder'
          }
        : null
    ].filter(Boolean) as Array<{
      id: number;
      type: 'STOCK' | 'ORDERS' | 'CHAT';
      title: string;
      message: string;
      severity: 'critical' | 'warning' | 'info';
      actionRoute: string;
      actionText: string;
    }>;

    if (this.selectedAlertFilter() === 'ALL') return alerts;
    return alerts.filter(a => a.type === this.selectedAlertFilter());
  }

  getTopProductsSummary() {
    const counts = new Map<number, { sold: number; revenue: number }>();
    for (const order of this.sellerService.orders()) {
      for (const item of order.items) {
        const current = counts.get(item.productoId) ?? { sold: 0, revenue: 0 };
        current.sold += item.cantidad;
        current.revenue += item.cantidad * item.precio;
        counts.set(item.productoId, current);
      }
    }

    return this.sellerService.products()
      .map(product => ({
        ...product,
        sold: counts.get(product.id)?.sold ?? 0,
        revenue: counts.get(product.id)?.revenue ?? 0
      }))
      .filter(product => product.sold > 0)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 4);
  }
}
