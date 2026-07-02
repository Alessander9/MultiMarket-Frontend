import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SellerService, SellerCustomer, SellerOrder } from '../../../services/seller.service';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { PaginationControlsComponent } from '../../../shared/pagination-controls/pagination-controls';

@Component({
  selector: 'app-seller-customers',
  standalone: true,
  imports: [CommonModule, PaginatePipe, PaginationControlsComponent],
  templateUrl: './customers.html',
  styleUrl: './customers.css'
})
export class SellerCustomers implements OnInit {
  protected readonly sellerService = inject(SellerService);

  readonly viewState = signal<'list' | 'detail'>('list');
  readonly selectedCustomer = signal<SellerCustomer | null>(null);

  readonly searchFilter = signal('');
  readonly currentPage = signal(1);
  readonly historyPage = signal(1);
  readonly pageSize = 8;

  ngOnInit(): void {}

  // --- FILTERS & COMPUTED ---

  readonly filteredCustomers = computed(() => {
    let list = this.sellerService.customers();
    const q = this.searchFilter().trim().toLowerCase();
    if (q) {
      list = list.filter(c => 
        c.nombre.toLowerCase().includes(q) || 
        c.correo.toLowerCase().includes(q) || 
        c.ciudad.toLowerCase().includes(q)
      );
    }
    return list;
  });

  // Client purchases history
  readonly customerOrdersHistory = computed(() => {
    const cust = this.selectedCustomer();
    if (!cust) return [];
    return this.sellerService.orders().filter(o => o.clienteCorreo === cust.correo);
  });

  // --- ACTIONS ---

  openDetail(customer: SellerCustomer): void {
    this.selectedCustomer.set(customer);
    this.viewState.set('detail');
    this.historyPage.set(1);
  }

  closeDetail(): void {
    this.selectedCustomer.set(null);
    this.viewState.set('list');
  }

  resetPage(): void {
    this.currentPage.set(1);
  }

  resetHistoryPage(): void {
    this.historyPage.set(1);
  }
}
