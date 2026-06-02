import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SellerService, SellerCustomer, SellerOrder } from '../../../services/seller.service';

@Component({
  selector: 'app-seller-customers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customers.html',
  styleUrl: './customers.css'
})
export class SellerCustomers implements OnInit {
  protected readonly sellerService = inject(SellerService);

  readonly viewState = signal<'list' | 'detail'>('list');
  readonly selectedCustomer = signal<SellerCustomer | null>(null);

  readonly searchFilter = signal('');

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
  }

  closeDetail(): void {
    this.selectedCustomer.set(null);
    this.viewState.set('list');
  }
}
