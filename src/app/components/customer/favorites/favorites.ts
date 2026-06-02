import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CustomerService } from '../../../services/customer.service';
import { SellerService, SellerProduct } from '../../../services/seller.service';

@Component({
  selector: 'app-customer-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css'
})
export class CustomerFavorites {
  protected readonly customerService = inject(CustomerService);
  protected readonly sellerService = inject(SellerService);

  readonly favoritedProductsList = computed(() => {
    const favIds = this.customerService.favorites();
    return this.sellerService.products().filter(p => favIds.includes(p.id));
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
}
