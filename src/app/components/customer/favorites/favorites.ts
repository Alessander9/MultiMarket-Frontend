import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CustomerService } from '../../../services/customer.service';
import { SellerService, SellerProduct } from '../../../services/seller.service';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { PaginationControlsComponent } from '../../../shared/pagination-controls/pagination-controls';

@Component({
  selector: 'app-customer-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule, PaginatePipe, PaginationControlsComponent],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css'
})
export class CustomerFavorites {
  protected readonly customerService = inject(CustomerService);
  protected readonly sellerService = inject(SellerService);
  readonly currentPage = signal(1);
  readonly pageSize = 8;

  readonly favoritedProductsList = computed(() => {
    return this.customerService.favoriteProducts().map(prod => ({
      id: prod.id,
      nombre: prod.nombre,
      descripcion: prod.descripcion,
      sku: prod.sku,
      precio: prod.precio,
      stock: prod.stock,
      peso: 0,
      estado: prod.stock <= 0 ? 'SIN_STOCK' : 'ACTIVO',
      categoria: prod.categoriaNombre,
      imagenes: prod.imagenes.map(img => img.url),
      vendedorId: prod.vendedorId,
      vendedorNombreTienda: prod.vendedorNombreTienda
    })) as SellerProduct[];
  });

  removeFromFavorites(prodId: number, event: Event): void {
    event.stopPropagation();
    this.customerService.toggleFavorite(prodId);
  }

  addToCart(prod: SellerProduct, event: Event): void {
    event.stopPropagation();
    this.customerService.addToCart(prod, 1);
    this.customerService.toggleFavorite(prod.id); // Remove from favorites after adding to cart
    this.customerService.showToast(`¡"${prod.nombre}" añadido al carrito y retirado de favoritos!`, 'success');
  }

  resetPage(): void {
    this.currentPage.set(1);
  }
}
