import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CustomerService } from '../../../services/customer.service';
import { SellerService, SellerProduct } from '../../../services/seller.service';
import { AdminPortalService } from '../../../services/admin-portal.service';

@Component({
  selector: 'app-customer-products-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './products.html',
  styleUrl: './products.css'
})
export class CustomerProducts implements OnInit {
  protected readonly customerService = inject(CustomerService);
  protected readonly sellerService = inject(SellerService);
  protected readonly portalService = inject(AdminPortalService);
  private readonly route = inject(ActivatedRoute);

  // local states
  readonly isLoading = signal(false);

  // Filters State Signals
  readonly searchQuery = signal('');
  readonly selectedCategory = signal('ALL');
  readonly selectedVendorId = signal<number | null>(null);
  readonly selectedVendorName = signal<string | null>(null);
  readonly priceMin = signal<number | null>(null);
  readonly priceMax = signal<number | null>(null);
  readonly selectedRating = signal('ALL');
  readonly selectedAvailability = signal('ALL');

  // Sorting
  readonly sortBy = signal<string>('sales'); // sales, priceAsc, priceDesc, newest

  ngOnInit(): void {
    // Bind query params
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.searchQuery.set(params['q']);
      } else {
        this.searchQuery.set('');
      }

      if (params['category']) {
        this.selectedCategory.set(params['category']);
      } else {
        this.selectedCategory.set('ALL');
      }

      if (params['vendorId']) {
        this.selectedVendorId.set(+params['vendorId']);
        this.selectedVendorName.set(params['vendorName'] ?? null);
      } else {
        this.selectedVendorId.set(null);
        this.selectedVendorName.set(null);
      }
    });

    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
    }, 400);
  }

  // --- FILTERS & COMPUTED ---

  readonly filteredCatalogProducts = computed(() => {
    let rawProds = this.portalService.products();

    // Map relational categories and vendors for unified frontend use
    let prods = rawProds.map(p => {
      const cat = this.portalService.categories().find(c => c.id === p.categoriaId);
      const vend = this.portalService.vendors().find(v => v.id === p.vendedorId);
      return {
        ...p,
        categoriaNombre: cat ? cat.nombre : 'Gourmet',
        vendedorNombre: vend ? vend.nombreTienda : 'Tienda Oficial'
      };
    });

    const vendorId = this.selectedVendorId();
    if (vendorId !== null) {
      prods = prods.filter(p => p.vendedorId === vendorId);
    }

    // 1. Search Query
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      prods = prods.filter(p => p.nombre.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }

    // 2. Category
    const cat = this.selectedCategory();
    if (cat !== 'ALL') {
      prods = prods.filter(p => p.categoriaNombre === cat);
    }

    // 3. Price range
    const min = this.priceMin();
    if (min !== null) {
      prods = prods.filter(p => p.precio >= min);
    }
    const max = this.priceMax();
    if (max !== null) {
      prods = prods.filter(p => p.precio <= max);
    }

    // 4. Availability
    const avail = this.selectedAvailability();
    if (avail === 'IN_STOCK') {
      prods = prods.filter(p => p.stock > 0);
    } else if (avail === 'OUT_STOCK') {
      prods = prods.filter(p => p.stock === 0);
    }

    // 5. Sorting
    const sort = this.sortBy();
    if (sort === 'priceAsc') {
      prods = [...prods].sort((a, b) => a.precio - b.precio);
    } else if (sort === 'priceDesc') {
      prods = [...prods].sort((a, b) => b.precio - a.precio);
    } else if (sort === 'newest') {
      prods = [...prods].sort((a, b) => b.id - a.id);
    }

    return prods;
  });

  readonly categoriesList = computed(() => {
    return this.portalService.categories().map(c => c.nombre);
  });

  readonly selectedVendor = computed(() => {
    const vendorId = this.selectedVendorId();
    if (vendorId === null) return null;
    return this.portalService.vendors().find(v => v.id === vendorId) || null;
  });

  readonly selectedVendorLabel = computed(() => {
    return this.selectedVendorName() || this.selectedVendor()?.nombreTienda || null;
  });

  // --- ACTIONS ---

  addToCart(prod: any, event: Event): void {
    event.stopPropagation();
    this.customerService.addToCart(prod, 1);
    this.customerService.showToast(`¡"${prod.nombre}" añadido al carrito!`, 'success');
  }

  toggleFavorite(prodId: number, event: Event): void {
    event.stopPropagation();
    this.customerService.toggleFavorite(prodId);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('ALL');
    this.selectedVendorId.set(null);
    this.selectedVendorName.set(null);
    this.priceMin.set(null);
    this.priceMax.set(null);
    this.selectedRating.set('ALL');
    this.selectedAvailability.set('ALL');
    this.sortBy.set('sales');
  }
}
