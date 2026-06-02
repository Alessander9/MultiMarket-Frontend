import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../../services/customer.service';

@Component({
  selector: 'app-customer-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css'
})
export class CustomerCart {
  protected readonly customerService = inject(CustomerService);
  private readonly router = inject(Router);

  updateQty(prodId: number, currentQty: number, offset: number): void {
    this.customerService.updateCartQty(prodId, currentQty + offset);
  }

  removeItem(prodId: number): void {
    this.customerService.removeFromCart(prodId);
  }

  clearCart(): void {
    if (confirm('¿Está seguro de que desea vaciar todo su carrito de compras?')) {
      this.customerService.clearCart();
    }
  }

  proceedToCheckout(): void {
    this.router.navigate(['/checkout']);
  }
}
