import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminPortalService } from '../../../services/admin-portal.service';

@Component({
  selector: 'app-customer-stores',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './stores.html',
  styleUrl: './stores.css'
})
export class CustomerStores implements OnInit {
  protected readonly portalService = inject(AdminPortalService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly searchQuery = signal('');
  readonly selectedRegion = signal('ALL');

  ngOnInit(): void {
    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
    }, 400);
  }

  readonly filteredStores = computed(() => {
    let list = this.portalService.vendors().filter(v => v.activo);

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(v => 
        v.nombreTienda.toLowerCase().includes(q) || 
        v.descripcion.toLowerCase().includes(q) ||
        v.region.toLowerCase().includes(q)
      );
    }

    const reg = this.selectedRegion();
    if (reg !== 'ALL') {
      list = list.filter(v => v.region === reg);
    }

    return list;
  });

  readonly regionsList = computed(() => {
    const list = this.portalService.vendors().map(v => v.region);
    return Array.from(new Set(list));
  });

  visitStore(vendorId: number, vendorName: string): void {
    this.router.navigate(['/products'], { queryParams: { vendorId, vendorName } });
  }
}
