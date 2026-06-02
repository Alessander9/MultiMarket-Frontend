import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { CustomerService } from '../../../services/customer.service';
import { AdminPortalService } from '../../../services/admin-portal.service';

@Component({
  selector: 'app-customer-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './customer-layout.html',
  styleUrl: './customer-layout.css'
})
export class CustomerLayout implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly customerService = inject(CustomerService);
  protected readonly portalService = inject(AdminPortalService);
  private readonly router = inject(Router);

  // Dropdown states
  readonly showCategoriesMenu = signal(false);
  readonly showNotificationsPanel = signal(false);
  readonly showProfileMenu = signal(false);
  readonly showMobileSearch = signal(false);

  // Search input
  readonly searchQuery = signal('');

  // Mega Menu Categories Mock
  readonly megaCategories = [
    { nombre: 'Café', icon: 'coffee', desc: 'Granos de altura, molidos e instantáneos de cooperativas locales.' },
    { nombre: 'Chocolate', icon: 'bakery_dining', desc: 'Tabletas para taza, bombones y barras de cacao chuncho 100% puro.' },
    { nombre: 'Miel', icon: 'hive', desc: 'Miel silvestre de bosque seco, algarrobo y néctar de flores.' },
    { nombre: 'Artesanías', icon: 'brush', desc: 'Piezas cerámicas pintadas a mano, tallados y ornamentos tradicionales.' },
    { nombre: 'Textiles', icon: 'apparel', desc: 'Prendas de alpaca, tejidos a telar andinos y telares decorativos.' }
  ];

  ngOnInit(): void {
    this.customerService.loadBackendData().subscribe();
    this.portalService.loadProducts().subscribe();
    this.portalService.loadCategories().subscribe();
    // Automatically close menus on routing
    this.router.events.subscribe(() => {
      this.closeAllMenus();
    });
  }

  closeAllMenus(except?: 'categories' | 'notifications' | 'profile'): void {
    if (except !== 'categories') this.showCategoriesMenu.set(false);
    if (except !== 'notifications') this.showNotificationsPanel.set(false);
    if (except !== 'profile') this.showProfileMenu.set(false);
  }

  toggleCategories(): void {
    this.closeAllMenus('categories');
    this.showCategoriesMenu.update(v => !v);
  }

  toggleNotifications(): void {
    this.closeAllMenus('notifications');
    this.showNotificationsPanel.update(v => !v);
  }

  toggleProfile(): void {
    this.closeAllMenus('profile');
    this.showProfileMenu.update(v => !v);
  }

  triggerSearch(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const q = this.searchQuery().trim();
    if (q) {
      this.router.navigate(['/products'], { queryParams: { q } });
      this.showMobileSearch.set(false);
    }
  }

  selectCategory(catName: string): void {
    this.router.navigate(['/products'], { queryParams: { category: catName } });
    this.showCategoriesMenu.set(false);
  }

  markAllNotificationsRead(): void {
    this.customerService.markNotificationsRead();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
