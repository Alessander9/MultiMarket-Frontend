import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SellerService, SellerProduct, SellerOrder } from '../../../services/seller.service';

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
    
    // Simulate API fetch delay
    setTimeout(() => {
      this.isLoading.set(false);
    }, 400);
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
    const alerts = [
      { id: 1, type: 'STOCK', title: 'Stock Crítico', message: 'El producto "Café Espresso Roast" tiene menos de 10 unidades.', severity: 'critical', actionRoute: '/seller/inventory', actionText: 'Ajustar Stock' },
      { id: 2, type: 'ORDERS', title: 'Pedidos Pendientes', message: `Tienes ${this.sellerService.pendingOrdersCount()} pedidos esperando ser procesados.`, severity: 'warning', actionRoute: '/seller/orders', actionText: 'Ver Pedidos' },
      { id: 3, type: 'CHAT', title: 'Mensajes Sin Leer', message: `Hay ${this.sellerService.unreadChatsCount()} consultas de clientes sin responder.`, severity: 'info', actionRoute: '/seller/chat', actionText: 'Responder' }
    ];

    if (this.selectedAlertFilter() === 'ALL') return alerts;
    return alerts.filter(a => a.type === this.selectedAlertFilter());
  }
}
