import { Component, inject, signal, computed, effect, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { CustomerService } from '../../../services/customer.service';
import { AdminPortalService } from '../../../services/admin-portal.service';
import { ChatService } from '../../../services/chat.service';
import { ThemeService } from '../../../services/theme.service';

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
  protected readonly chatService = inject(ChatService);
  protected readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  @ViewChild('persistentChatScroll') private persistentChatScroll?: ElementRef<HTMLElement>;

  // Dropdown states
  readonly showCategoriesMenu = signal(false);
  readonly showNotificationsPanel = signal(false);
  readonly showProfileMenu = signal(false);
  readonly showCartPreview = signal(false);
  readonly showMobileSearch = signal(false);
  readonly chatDockOpen = signal(false);
  readonly chatDockExpanded = signal(false);
  readonly selectedChatConversationId = signal<number | null>(null);
  readonly chatDraft = signal('');
  readonly currentUrl = signal('/');
  readonly cartBadgePulse = signal(false);

  // Search input
  readonly searchQuery = signal('');

  readonly activeChatConversation = computed(() => {
    const conversations = this.customerService.conversations();
    const selectedId = this.selectedChatConversationId();
    if (conversations.length === 0) return null;
    return conversations.find(conv => conv.id === selectedId) ?? conversations[0];
  });

  readonly showPersistentChatDock = computed(() => {
    const url = this.currentUrl();
    return (url === '/' || url.startsWith('/stores') || /^\/products\/\d+/.test(url)) && !url.startsWith('/chat');
  });

  readonly canUseBuyerFeatures = computed(() => this.authService.currentUserRoles().includes('COMPRADOR'));

  getDashboardRoute(): string {
    const roles = this.authService.currentUserRoles();
    if (roles.includes('ADMIN')) return '/admin/dashboard';
    if (roles.includes('VENDEDOR')) return '/seller/dashboard';
    return '/dashboard';
  }

  readonly chatDockStateLabel = computed(() => {
    if (!this.chatDockOpen()) return 'Cerrado';
    if (this.chatDockExpanded()) return 'Vista ampliada';
    return 'Vista rápida';
  });

  readonly cartPreviewItems = computed(() => this.customerService.cart().slice(0, 4));
  private lastCartCount = 0;
  private cartBadgeTimer?: ReturnType<typeof setTimeout>;

  // Mega menu categories
  readonly megaCategories = [
    { nombre: 'Café', icon: 'coffee', desc: 'Granos de altura, molidos e instantáneos de cooperativas locales.' },
    { nombre: 'Chocolate', icon: 'bakery_dining', desc: 'Tabletas para taza, bombones y barras de cacao chuncho 100% puro.' },
    { nombre: 'Miel', icon: 'hive', desc: 'Miel silvestre de bosque seco, algarrobo y néctar de flores.' },
    { nombre: 'Artesanías', icon: 'brush', desc: 'Piezas cerámicas pintadas a mano, tallados y ornamentos tradicionales.' },
    { nombre: 'Textiles', icon: 'apparel', desc: 'Prendas de alpaca, tejidos a telar andinos y telares decorativos.' }
  ];

  constructor() {
    effect(() => {
      const conversations = this.customerService.conversations();
      const currentId = this.selectedChatConversationId();

      if (conversations.length === 0) {
        if (currentId !== null) {
          this.selectedChatConversationId.set(null);
        }
        return;
      }

      const selected = currentId ? conversations.find(conv => conv.id === currentId) : undefined;
      const target = selected ?? conversations.find(conv => conv.noLeidos > 0) ?? conversations[0];

      if (target && target.id !== currentId) {
        this.selectedChatConversationId.set(target.id);
        this.loadConversationHistory(target.id);
      }
    });

    effect(() => {
      const currentCount = this.customerService.cartCount();
      if (currentCount !== this.lastCartCount) {
        this.lastCartCount = currentCount;
        this.cartBadgePulse.set(true);
        if (this.cartBadgeTimer) {
          clearTimeout(this.cartBadgeTimer);
        }
        this.cartBadgeTimer = setTimeout(() => {
          this.cartBadgePulse.set(false);
        }, 420);
      }
    });
  }

  ngOnInit(): void {
    this.currentUrl.set(this.router.url);
    this.customerService.loadBackendData().subscribe();
    this.portalService.loadVendors().subscribe();
    this.portalService.loadProducts().subscribe();
    this.portalService.loadCategories().subscribe();

    // Establish websocket connection
    const email = this.authService.currentUserEmail();
    if (email) {
      this.chatService.connect(email);
    }

    // Automatically close menus on routing
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects || event.url);
        if (!this.showPersistentChatDock()) {
          this.chatDockOpen.set(false);
        }
        this.showCartPreview.set(false);
      }

      this.closeAllMenus();
    });

    this.route.queryParamMap.subscribe(params => {
      const conversationIdParam = params.get('conversationId') ?? params.get('chatConversationId');
      if (conversationIdParam) {
        const conversationId = Number(conversationIdParam);
        if (Number.isFinite(conversationId)) {
          this.openConversationById(conversationId);
          return;
        }
      }

      const vendorIdParam = params.get('chatVendorId');
      if (!vendorIdParam) return;

      const vendorId = Number(vendorIdParam);
      if (!Number.isFinite(vendorId)) return;

      this.openConversationForVendor(vendorId);
    });
  }

  selectChatConversation(conversationId: number): void {
    this.selectedChatConversationId.set(conversationId);
    this.clearUnreadCount(conversationId);
    this.loadConversationHistory(conversationId);
  }

  focusChatPanel(): void {
    if (!this.showPersistentChatDock()) {
      this.router.navigate(['/stores']);
      return;
    }

    this.chatDockOpen.set(true);
    const conversations = this.customerService.conversations();
    if (conversations.length === 0) return;

    const target = conversations.find(conv => conv.noLeidos > 0) ?? conversations[0];
    this.selectChatConversation(target.id);
    this.scrollChatToBottom();
  }

  toggleChatDock(): void {
    if (!this.chatDockOpen()) {
      this.chatDockOpen.set(true);
      this.chatDockExpanded.set(false);
      return;
    }

    this.chatDockOpen.set(false);
    this.chatDockExpanded.set(false);
  }

  restoreChatDock(): void {
    this.chatDockOpen.set(true);
  }

  toggleExpandChatDock(): void {
    this.chatDockOpen.set(true);
    this.chatDockExpanded.update(value => !value);
  }

  openConversationForVendor(vendorId: number): void {
    this.chatDockOpen.set(true);
    this.chatDockExpanded.set(true);
    this.customerService.openConversation(vendorId).subscribe({
      next: conv => {
        this.selectedChatConversationId.set(conv.id);
        this.loadConversationHistory(conv.id);
        this.scrollChatToBottom();
      }
    });
  }

  openConversationById(conversationId: number): void {
    this.chatDockOpen.set(true);
    this.chatDockExpanded.set(true);

    const existing = this.customerService.conversations().find(conv => conv.id === conversationId);
    if (existing) {
      this.selectedChatConversationId.set(existing.id);
      this.loadConversationHistory(existing.id);
      this.scrollChatToBottom();
      return;
    }

    this.customerService.loadMessageHistory(conversationId).subscribe({
      next: () => {
        const refreshed = this.customerService.conversations().find(conv => conv.id === conversationId);
        if (refreshed) {
          this.selectedChatConversationId.set(refreshed.id);
        }
        this.scrollChatToBottom();
      }
    });
  }

  sendChatMessage(): void {
    const draft = this.chatDraft().trim();
    const conversation = this.activeChatConversation();
    if (!draft || !conversation) return;

    this.customerService.sendChatMessage(conversation.vendedorId, draft).subscribe({
      next: () => {
        this.chatDraft.set('');
        this.scrollChatToBottom();
      }
    });
  }

  getChatPreview(conversationId: number): string {
    const conversation = this.customerService.conversations().find(conv => conv.id === conversationId);
    if (!conversation) return '';
    return conversation.ultimoMensaje || 'Sin mensajes aún';
  }

  getSelectedChatTitle(): string {
    const conversation = this.activeChatConversation();
    return conversation?.vendedorNombreTienda ?? 'Mensajes';
  }

  getSelectedChatRoleLabel(): string {
    return 'Comprador';
  }

  getCounterpartyRoleLabel(): string {
    return 'Vendedor';
  }

  isOwnMessage(messageRole: 'COMPRADOR' | 'VENDEDOR'): boolean {
    return messageRole === 'COMPRADOR';
  }

  getSuggestedVendorsLimit(): number {
    return 5;
  }

  private loadConversationHistory(conversationId: number): void {
    this.chatDockOpen.set(true);
    this.customerService.loadMessageHistory(conversationId).subscribe({
      next: () => this.scrollChatToBottom()
    });
  }

  private clearUnreadCount(conversationId: number): void {
    this.customerService.conversations.update(list =>
      list.map(conv => conv.id === conversationId ? { ...conv, noLeidos: 0 } : conv)
    );
  }

  private scrollChatToBottom(): void {
    queueMicrotask(() => {
      try {
        if (this.persistentChatScroll) {
          const element = this.persistentChatScroll.nativeElement;
          element.scrollTop = element.scrollHeight;
        }
      } catch {
        // Safe fail for layout rendering timing.
      }
    });
  }

  closeAllMenus(except?: 'categories' | 'notifications' | 'profile' | 'cart'): void {
    if (except !== 'categories') this.showCategoriesMenu.set(false);
    if (except !== 'notifications') this.showNotificationsPanel.set(false);
    if (except !== 'profile') this.showProfileMenu.set(false);
    if (except !== 'cart') this.showCartPreview.set(false);
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

  toggleCartPreview(): void {
    this.closeAllMenus();
    this.showCartPreview.update(v => !v);
  }

  openCartPage(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.showCartPreview.set(false);
    this.router.navigate(['/cart']);
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
    this.chatService.disconnect();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
