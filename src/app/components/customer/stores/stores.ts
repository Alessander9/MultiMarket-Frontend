import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AdminPortalService } from '../../../services/admin-portal.service';
import { finalize } from 'rxjs';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { PaginationControlsComponent } from '../../../shared/pagination-controls/pagination-controls';

@Component({
  selector: 'app-customer-stores',
  standalone: true,
  imports: [CommonModule, RouterModule, PaginatePipe, PaginationControlsComponent],
  templateUrl: './stores.html',
  styleUrl: './stores.css'
})
export class CustomerStores implements OnInit {
  protected readonly portalService = inject(AdminPortalService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);
  readonly searchQuery = signal('');
  readonly selectedRegion = signal('ALL');
  readonly currentPage = signal(1);
  readonly pageSize = 8;

  ngOnInit(): void {
    this.isLoading.set(true);

      this.portalService.loadVendors().pipe(
      finalize(() => {
        this.isLoading.set(false);
      })
    ).subscribe({
      error: (err) => {
        console.error('No se pudieron cargar las tiendas:', err);
      }
    });
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

    // Sort alphabetically by store/vendor name
    return [...list].sort((a, b) => a.nombreTienda.localeCompare(b.nombreTienda));
  });

  readonly regionsList = computed(() => {
    const list = this.portalService.vendors().map(v => v.region);
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
  });

  visitStore(vendorId: number, vendorName: string): void {
    this.router.navigate(['/products'], { queryParams: { vendorId, vendorName } });
  }

  openChat(vendorId: number): void {
    this.router.navigate(['/stores'], { queryParams: { chatVendorId: vendorId } });
  }

  resetPage(): void {
    this.currentPage.set(1);
  }
}
