import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../../services/customer.service';
import { AdminPortalService } from '../../../services/admin-portal.service';

@Component({
  selector: 'app-customer-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class CustomerHome implements OnInit {
  protected readonly customerService = inject(CustomerService);
  protected readonly portalService = inject(AdminPortalService);
  private readonly router = inject(Router);

  // local loading states
  readonly isLoading = signal(false);

  // Sorted list helpers for neat organization
  readonly featuredVendors = computed(() => {
    return [...this.portalService.vendors()]
      .filter(v => v.activo)
      .sort((a, b) => b.calificacionPromedio - a.calificacionPromedio)
      .slice(0, 4);
  });

  readonly recommendedProducts = computed(() => {
    return [...this.portalService.products()]
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .slice(0, 8);
  });

  // Active Promo Index for Hero Slider
  readonly promoIndex = signal(0);

  // Promo Banners Mock (Local and Authentic)
  readonly promos = [
    { title: 'Cafés Orgánicos de Altura', subtitle: 'Prueba la frescura de granos recién tostados cosechados en el Cusco y San Martín.', buttonText: 'Explorar Cafés', img: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=1200&auto=format&fit=crop&q=80', cat: 'Café' },
    { title: 'Cacao Fino de Aroma', subtitle: 'Exclusiva selección de tabletas artesanales de chocolate amargo al 70% elaboradas en Cusco.', buttonText: 'Ver Chocolates', img: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=1200&auto=format&fit=crop&q=80', cat: 'Chocolate' },
    { title: 'Herramientas de Calidad', subtitle: 'Líderes en distribución de ferretería profesional y herramientas Cleo.', buttonText: 'Ir a Ferretería', img: 'https://images.unsplash.com/photo-1513828722001-c22dbf88279e?w=1200&auto=format&fit=crop&q=80', cat: 'Ferretería' }
  ];

  ngOnInit(): void {
    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
    }, 350);

    // Auto rotate banners every 5 seconds
    setInterval(() => {
      this.promoIndex.update(idx => (idx + 1) % this.promos.length);
    }, 5000);
  }

  selectPromoCat(catName: string): void {
    this.router.navigate(['/products'], { queryParams: { category: catName } });
  }

  browseVendor(vendorId: number, vendorName: string): void {
    this.router.navigate(['/products'], { queryParams: { vendorId, vendorName } });
  }

  addToCart(prod: any, event: Event): void {
    event.stopPropagation();
    this.customerService.addToCart(prod, 1);
    this.customerService.showToast(`¡"${prod.nombre}" añadido al carrito!`, 'success');
  }

  toggleFavorite(prodId: number, event: Event): void {
    event.stopPropagation();
    this.customerService.toggleFavorite(prodId);
  }

  // Helper to lookup vendor name from database
  getVendorName(vendorId: number): string {
    return this.portalService.vendors().find(v => v.id === vendorId)?.nombreTienda || 'Tienda Oficial';
  }
}
