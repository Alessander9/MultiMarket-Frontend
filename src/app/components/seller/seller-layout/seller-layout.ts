import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { SellerService, SellerConversation } from '../../../services/seller.service';
import { ChatService } from '../../../services/chat.service';
import { ThemeService } from '../../../services/theme.service';
import { filter, Subscription } from 'rxjs';
import { SellerNotification } from '../../../services/seller.service';

interface SidebarMenuItem {
  label: string;
  route: string;
  icon: string;
  badgeSignal?: () => number;
}

interface SidebarSection {
  title: string;
  items: SidebarMenuItem[];
}

interface ChatPreviewItem extends SellerConversation {
  previewText: string;
  metaText: string;
}

@Component({
  selector: 'app-seller-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './seller-layout.html',
  styleUrl: './seller-layout.css'
})
export class SellerLayout implements OnInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  protected readonly sellerService = inject(SellerService);
  protected readonly chatService = inject(ChatService);
  protected readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // UI state signals
  readonly sidebarCollapsed = signal(false);
  readonly mobileSidebarOpen = signal(false);
  readonly showNotificationsDropdown = signal(false);
  readonly showMessagesDropdown = signal(false);
  readonly showProfileDropdown = signal(false);
  
  // Breadcrumbs
  readonly breadcrumbs = signal<{ label: string; url: string }[]>([]);
  readonly recentChatPreviews = computed<ChatPreviewItem[]>(() => {
    return [...this.sellerService.conversations()]
      .sort((a, b) => {
        const unreadDiff = (b.noLeidos ?? 0) - (a.noLeidos ?? 0);
        if (unreadDiff !== 0) return unreadDiff;
        return new Date(b.fechaUltimoMensaje).getTime() - new Date(a.fechaUltimoMensaje).getTime();
      })
      .slice(0, 5)
      .map(conv => {
        const previewText = (conv.ultimoMensaje ?? '').trim() || 'Sin mensajes aún';
        const metaText = conv.noLeidos > 0
          ? `${conv.noLeidos} sin leer`
          : `${conv.mensajes?.length ?? 0} mensajes`;
        return {
          ...conv,
          previewText,
          metaText
        };
      });
  });

  private routerSubscription!: Subscription;

  // Sidebar Menu Items
  readonly menuSections: SidebarSection[] = [
    {
      title: 'DASHBOARD',
      items: [
        { label: 'Resumen', route: '/seller/dashboard', icon: 'dashboard' }
      ]
    },
    {
      title: 'MI TIENDA',
      items: [
        { label: 'Mi Tienda', route: '/seller/store', icon: 'storefront' }
      ]
    },
    {
      title: 'PRODUCTOS',
      items: [
        { label: 'Productos', route: '/seller/products', icon: 'inventory_2' }
      ]
    },
    {
      title: 'INVENTARIO',
      items: [
        { label: 'Stock e Inventario', route: '/seller/inventory', icon: 'warehouse' }
      ]
    },
    {
      title: 'PEDIDOS',
      items: [
        { 
          label: 'Pedidos', 
          route: '/seller/orders', 
          icon: 'shopping_bag',
          badgeSignal: () => this.sellerService.pendingOrdersCount()
        }
      ]
    },
    {
      title: 'VENTAS',
      items: [
        { label: 'Ventas y Reportes', route: '/seller/sales', icon: 'bar_chart' }
      ]
    },
    {
      title: 'CLIENTES',
      items: [
        { label: 'Compradores', route: '/seller/customers', icon: 'groups' }
      ]
    },
    {
      title: 'CHAT',
      items: [
        { 
          label: 'Chat Clientes', 
          route: '/seller/chat', 
          icon: 'chat',
          badgeSignal: () => this.sellerService.unreadChatsCount()
        }
      ]
    },
    {
      title: 'OPERACIONES XML',
      items: [
        { label: 'Importaciones XML', route: '/seller/imports', icon: 'upload' },
        { label: 'Exportaciones', route: '/seller/exports', icon: 'download' }
      ]
    },
    {
      title: 'PAGOS',
      items: [
        { label: 'Liquidaciones', route: '/seller/payments', icon: 'account_balance_wallet' }
      ]
    },
    {
      title: 'COMUNICACIÓN',
      items: [
        { 
          label: 'Notificaciones', 
          route: '/seller/notifications', 
          icon: 'notifications',
          badgeSignal: () => this.sellerService.unreadNotificationsCount()
        }
      ]
    },
    {
      title: 'CONFIGURACIÓN',
      items: [
        { label: 'Preferencias', route: '/seller/settings', icon: 'settings' }
      ]
    }
  ];

  ngOnInit(): void {
    // Generate initial breadcrumbs and update on navigation
    this.updateBreadcrumbs(this.router.url);
    this.sellerService.loadBackendData().subscribe();

    // Establish websocket connection
    const email = this.authService.currentUserEmail();
    if (email) {
      this.chatService.connect(email);
    }

    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateBreadcrumbs(event.url);
      this.mobileSidebarOpen.set(false); // Close sidebar on mobile navigation
      this.closeAllDropdowns();
    });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(val => !val);
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update(val => !val);
  }

  toggleNotifications(): void {
    this.closeAllDropdowns('notifications');
    this.sellerService.refreshRealtimeInbox();
    this.showNotificationsDropdown.update(val => !val);
  }

  toggleMessages(): void {
    this.closeAllDropdowns('messages');
    this.sellerService.refreshRealtimeInbox();
    this.showMessagesDropdown.update(val => !val);
  }

  toggleProfile(): void {
    this.closeAllDropdowns('profile');
    this.showProfileDropdown.update(val => !val);
  }

  getDashboardRoute(): string {
    return '/seller/dashboard';
  }

  closeAllDropdowns(except?: 'notifications' | 'messages' | 'profile'): void {
    if (except !== 'notifications') this.showNotificationsDropdown.set(false);
    if (except !== 'messages') this.showMessagesDropdown.set(false);
    if (except !== 'profile') this.showProfileDropdown.set(false);
  }

  markNotificationRead(id: number, event: Event): void {
    event.stopPropagation();
    this.sellerService.markNotificationAsRead(id);
  }

  markAllNotificationsRead(): void {
    this.sellerService.markAllNotificationsAsRead();
  }

  openNotification(notification: SellerNotification, event?: Event): void {
    event?.stopPropagation();

    if (notification.tipo === 'CHAT') {
      const conversationId = this.resolveConversationIdFromNotification(notification);
      if (conversationId !== null) {
        this.router.navigate(['/seller/chat'], {
          queryParams: { conversationId }
        });
      } else {
        this.router.navigate(['/seller/chat']);
      }
      this.sellerService.markNotificationAsRead(notification.id);
      this.closeAllDropdowns();
      return;
    }

    this.sellerService.markNotificationAsRead(notification.id);
  }

  openChatConversation(conversationId: number): void {
    this.closeAllDropdowns('messages');
    this.router.navigate(['/seller/chat'], {
      queryParams: { conversationId }
    });
  }

  handleSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    console.log('Buscador Global Seller:', input.value);
    // Future search integration
  }

  logout(): void {
    this.chatService.disconnect();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private updateBreadcrumbs(url: string): void {
    const cleanUrl = url.split('?')[0]?.split('#')[0] ?? url;
    const segments = cleanUrl.split('/').filter(p => p && p !== 'seller');
    const crumbs = [{ label: 'Inicio', url: '/seller/dashboard' }];
    
    let cumulativeUrl = '/seller';
    segments.forEach(seg => {
      cumulativeUrl += `/${seg}`;
      let label = seg.toUpperCase();
      
      switch (seg) {
        case 'dashboard': label = 'Resumen'; break;
        case 'store': label = 'Mi Tienda'; break;
        case 'products': label = 'Productos'; break;
        case 'inventory': label = 'Inventario'; break;
        case 'orders': label = 'Pedidos'; break;
        case 'sales': label = 'Ventas'; break;
        case 'customers': label = 'Compradores'; break;
        case 'chat': label = 'Chat Clientes'; break;
        case 'imports': label = 'Importaciones XML'; break;
        case 'exports': label = 'Exportaciones'; break;
        case 'payments': label = 'Liquidaciones y Pagos'; break;
        case 'notifications': label = 'Notificaciones'; break;
        case 'settings': label = 'Configuración'; break;
      }
      
      crumbs.push({ label, url: cumulativeUrl });
    });

    this.breadcrumbs.set(crumbs);
  }

  private resolveConversationIdFromNotification(notification: SellerNotification): number | null {
    const title = String(notification.titulo ?? '').toLowerCase();
    const content = String(notification.contenido ?? '').toLowerCase();

    const conversations = this.sellerService.conversations();

    if (title.includes('respuesta de')) {
      const storeName = notification.titulo.replace(/^Respuesta de\s+/i, '').trim().toLowerCase();
      const match = conversations.find(conv => conv.compradorNombre.toLowerCase() === storeName || conv.compradorCorreo.toLowerCase().includes(storeName));
      return match?.id ?? null;
    }

    if (title.includes('nuevo mensaje de')) {
      const senderName = notification.titulo.replace(/^Nuevo mensaje de\s+/i, '').trim().toLowerCase();
      const match = conversations.find(conv =>
        conv.compradorNombre.toLowerCase() === senderName.toLowerCase() ||
        conv.compradorCorreo.toLowerCase().includes(senderName.toLowerCase()) ||
        content.includes(conv.compradorNombre.toLowerCase())
      );
      return match?.id ?? null;
    }

    return null;
  }
}
