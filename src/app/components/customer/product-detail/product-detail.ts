import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../../services/customer.service';
import { SellerService, SellerProduct } from '../../../services/seller.service';
import { AdminPortalService } from '../../../services/admin-portal.service';

@Component({
  selector: 'app-customer-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css'
})
export class CustomerProductDetail implements OnInit {
  protected readonly customerService = inject(CustomerService);
  protected readonly sellerService = inject(SellerService);
  protected readonly portalService = inject(AdminPortalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // local active product state
  readonly product = signal<SellerProduct | null>(null);
  readonly purchaseQty = signal(1);

  private mapPortalProductToSellerProduct(portalProd: any): SellerProduct {
    return {
      id: portalProd.id,
      vendorId: portalProd.vendedorId,
      nombre: portalProd.nombre,
      descripcion: portalProd.descripcion,
      sku: portalProd.sku,
      categoria: portalProd.categoriaNombre || 'Sin categoría',
      precio: portalProd.precio,
      stock: portalProd.stock,
      peso: portalProd.peso,
      estado: portalProd.activo ? 'ACTIVO' : 'INACTIVO',
      imagenes: portalProd.imagenes
    };
  }

  ngOnInit(): void {
    // Read route param id
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      if (idStr) {
        const id = parseInt(idStr, 10);
        let prod: SellerProduct | null = null;

        // 1. Try searching in AdminPortalService first
        const portalProd = this.portalService.products().find(p => p.id === id);
        if (portalProd) {
          prod = this.mapPortalProductToSellerProduct(portalProd);
        } else {
          // 2. Fallback to SellerService in-memory products
          const sellerProd = this.sellerService.products().find(p => p.id === id);
          if (sellerProd) {
            prod = sellerProd;
          }
        }

        this.product.set(prod);
      }
    });
  }

  // --- GETTERS & COMPUTED ---

  readonly isFavorited = computed(() => {
    const prod = this.product();
    if (!prod) return false;
    return this.customerService.isFavorite(prod.id);
  });

  // Recommended related products
  readonly relatedProducts = computed(() => {
    const active = this.product();
    if (!active) return [];

    // Find in portalService first
    const portalRelated = this.portalService.products()
      .filter(p => p.id !== active.id && (p.categoriaNombre === active.categoria || p.categoriaId === (this.portalService.products().find(ap => ap.id === active.id)?.categoriaId)))
      .map(p => this.mapPortalProductToSellerProduct(p))
      .slice(0, 3);

    if (portalRelated.length > 0) {
      return portalRelated;
    }

    return this.sellerService.products().filter(p => p.categoria === active.categoria && p.id !== active.id).slice(0, 3);
  });

  // --- ACTIONS ---

  incrementQty(amount: number): void {
    const max = this.product()?.stock ?? 1;
    const next = this.purchaseQty() + amount;
    if (next >= 1 && next <= max) {
      this.purchaseQty.set(next);
    }
  }

  addToCart(): void {
    const prod = this.product();
    if (!prod) return;
    this.customerService.addToCart(prod, this.purchaseQty());
    this.customerService.showToast(`¡Se añadieron ${this.purchaseQty()} unidad(es) de "${prod.nombre}" al carrito!`, 'success');
  }

  buyNow(): void {
    const prod = this.product();
    if (!prod) return;
    this.customerService.addToCart(prod, this.purchaseQty());
    this.router.navigate(['/cart']); // Redirect directly to Cart
  }

  toggleFavorite(): void {
    const prod = this.product();
    if (prod) {
      this.customerService.toggleFavorite(prod.id);
    }
  }

  chatWithVendor(): void {
    const prod = this.product();
    if (!prod) return;
    const vendorId = prod.vendorId;
    if (!vendorId) return;

    this.customerService.openConversation(vendorId).subscribe({
      next: () => {
        this.router.navigate(['/products', prod.id], {
          queryParams: { chatVendorId: vendorId }
        });
      }
    });
  }
}
