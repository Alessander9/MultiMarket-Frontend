import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProductService, Product } from '../../services/product.service';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './productos.html',
  styleUrl: './productos.css'
})
export class Productos implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  // Component Signals
  readonly products = signal<Product[]>([]);
  readonly profileDetails = signal<any | null>(null);
  readonly isLoadingProducts = signal(false);
  readonly isLoadingProfile = signal(false);

  ngOnInit(): void {
    // Security check: if user is not logged in, redirect to login page immediately
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Automatically load products to show active database connectivity
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoadingProducts.set(true);
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products.set(data);
        this.isLoadingProducts.set(false);
      },
      error: () => {
        this.isLoadingProducts.set(false);
      }
    });
  }

  fetchProfile(): void {
    this.isLoadingProfile.set(true);
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.profileDetails.set(profile);
        this.isLoadingProfile.set(false);
      },
      error: () => {
        this.isLoadingProfile.set(false);
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
