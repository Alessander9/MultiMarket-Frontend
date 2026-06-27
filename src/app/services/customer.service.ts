import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { delay, tap, map, switchMap, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ChatService } from './chat.service';

// --- INTERFACES ---

export interface CartItem {
  productoId: number;
  nombre: string;
  sku: string;
  precio: number;
  cantidad: number;
  imagen: string;
  vendedorId: number;
  vendedorNombre: string;
}

export interface BuyerOrder {
  id: number;
  numeroPedido: string;
  fecha: string;
  vendedorId: number;
  vendedorNombreTienda: string;
  items: CartItem[];
  subtotal: number;
  envio: number;
  impuesto: number;
  total: number;
  estado: 'PENDIENTE' | 'PAGADO' | 'PROCESANDO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
  metodoPago: string;
  direccionEntrega: any;
  seguimiento: {
    fecha: string;
    descripcion: string;
    completado: boolean;
  }[];
}

export interface CheckoutVendorGroup {
  vendedorId: number;
  vendedorNombre: string;
  costoEnvio: number;
  items: CartItem[];
  subtotal: number;
  impuesto: number;
  total: number;
}

export interface GroupedCheckoutResult {
  id: number;
  numeroCompra: string;
  fechaCompra: string;
  metodoPago: string;
  estadoGeneral: string;
  pedidos: BuyerOrder[];
  items: CartItem[];
  subtotal: number;
  impuesto: number;
  costoEnvioTotal: number;
  total: number;
}

export interface BuyerPurchase extends GroupedCheckoutResult {}

export interface Address {
  id: number;
  nombreReferencia: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  codigoPostal: string;
  referencia: string;
  predeterminada: boolean;
}

export interface BuyerNotification {
  id: number;
  tipo: 'PEDIDO' | 'PAGO' | 'CHAT' | 'SISTEMA' | 'PROMOCION';
  titulo: string;
  contenido: string;
  fecha: string;
  leido: boolean;
}

export interface BuyerProfile {
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  foto: string;
}

export interface BuyerMessage {
  id: number;
  remitente: 'COMPRADOR' | 'VENDEDOR';
  contenido: string;
  fecha: string;
  leido: boolean;
}

export interface BuyerConversation {
  id: number;
  vendedorId: number;
  vendedorNombreTienda: string;
  vendedorLogo: string;
  ultimoMensaje: string;
  fechaUltimoMensaje: string;
  noLeidos: number;
  mensajes: BuyerMessage[];
}

export interface VendorMini {
  id: number;
  nombre: string;
  region: string;
  rating: number;
  logo: string;
}

export interface FavoriteProduct {
  id: number;
  nombre: string;
  descripcion: string;
  sku: string;
  precio: number;
  stock: number;
  categoriaNombre: string;
  vendedorId: number;
  vendedorNombreTienda: string;
  imagenes: { id?: number; url: string; principal?: boolean; ordenVisualizacion?: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly baseUrl = environment.apiUrl;
  private toastTimeout: any = null;

  constructor() {
    this.chatService.messageReceived$.subscribe(payload => {
      this.handleIncomingSocketMessage(payload);
    });
  }

  // --- STATE SIGNALS ---
  readonly activeToast = signal<{ message: string; type: 'success' | 'info' | 'error' | 'warning'; visible: boolean } | null>(null);

  // 1. Carrito de Compras
  readonly cart = signal<CartItem[]>([]);

  // 2. Favoritos
  readonly favorites = signal<number[]>([]);
  readonly favoriteProducts = signal<FavoriteProduct[]>([]);

  // 3. Direcciones
  readonly addresses = signal<Address[]>([]);

  // 4. Perfil Comprador
  readonly profile = signal<BuyerProfile>({
    nombres: '',
    apellidos: '',
    correo: this.authService.currentUserEmail() ?? '',
    telefono: '',
    foto: '/img/AdultoMayor.jpg'
  });

  // 5. Preferencias
  readonly preferences = signal({
    idioma: 'es',
    zonaHoraria: 'America/Lima (UTC-5)',
    notificacionesEmail: true,
    notificacionesPush: true,
    tema: 'dark'
  });

  // 6. Pedidos Realizados
  readonly orders = signal<BuyerOrder[]>([]);

  readonly purchases = signal<BuyerPurchase[]>([]);

  // 7. Chats y Conversaciones
  readonly conversations = signal<BuyerConversation[]>([]);

  // 8. Notificaciones
  readonly notifications = signal<BuyerNotification[]>([]);

  // 9. Vendedores recomendados
  readonly topVendors = signal<VendorMini[]>([]);

  private normalizeOrder(order: any, context?: { metodoPago?: string; direccionEntrega?: any }): BuyerOrder {
    return {
      id: Number(order?.id ?? 0),
      numeroPedido: order?.numeroPedido ?? '',
      fecha: order?.fechaPedido ?? order?.fecha ?? new Date().toISOString(),
      vendedorId: Number(order?.vendedorId ?? 0),
      vendedorNombreTienda: order?.vendedorNombreTienda ?? order?.vendedorTienda ?? order?.vendedorNombre ?? 'Tienda',
      items: (order?.detalles ?? order?.items ?? []).map((item: any, idx: number) => ({
        productoId: Number(item?.productoId ?? 0),
        nombre: item?.productoNombre ?? item?.nombre ?? '',
        sku: item?.sku ?? '',
        precio: Number(item?.precioUnitario ?? item?.precio ?? 0),
        cantidad: Number(item?.cantidad ?? 0),
        imagen: item?.imagen ?? item?.imagenes?.[0] ?? '/img/aceite-oliva.jpeg',
        vendedorId: Number(order?.vendedorId ?? 0),
        vendedorNombre: order?.vendedorNombreTienda ?? order?.vendedorTienda ?? order?.vendedorNombre ?? 'Tienda'
      })),
      subtotal: Number(order?.subtotal ?? 0),
      envio: Number(order?.costoEnvio ?? order?.envio ?? 0),
      impuesto: Number(order?.impuesto ?? 0),
      total: Number(order?.total ?? 0),
      estado: (order?.estado ?? 'PENDIENTE') as BuyerOrder['estado'],
      metodoPago: order?.metodoPago ?? context?.metodoPago ?? '',
      direccionEntrega: order?.direccionEntrega ?? context?.direccionEntrega ?? {},
      seguimiento: (order?.seguimiento ?? []).map((s: any) => ({
        fecha: s?.fecha ?? new Date().toISOString(),
        descripcion: s?.descripcion ?? '',
        completado: Boolean(s?.completado)
      }))
    };
  }

  private normalizePurchase(purchase: any, context?: { metodoPago?: string; direccionEntrega?: any }): BuyerPurchase {
    const pedidos = (purchase?.pedidos ?? []).map((order: any) => this.normalizeOrder(order, context));
    const items = pedidos.flatMap((order: BuyerOrder) =>
      order.items.map((item: CartItem) => ({
        ...item,
        vendedorId: order.vendedorId,
        vendedorNombre: order.vendedorNombreTienda
      }))
    );

    return {
      id: Number(purchase?.id ?? 0),
      numeroCompra: purchase?.numeroCompra ?? '',
      fechaCompra: purchase?.fechaCompra ?? new Date().toISOString(),
      metodoPago: purchase?.metodoPago ?? context?.metodoPago ?? '',
      estadoGeneral: purchase?.estadoGeneral ?? 'PAGADO',
      pedidos,
      items,
      subtotal: Number(purchase?.subtotal ?? 0),
      impuesto: Number(purchase?.impuesto ?? 0),
      costoEnvioTotal: Number(purchase?.costoEnvioTotal ?? 0),
      total: Number(purchase?.total ?? 0)
    };
  }

  private normalizeConversation(conv: any): BuyerConversation {
    const vendorName = conv?.vendedorTienda ?? conv?.vendedorNombreTienda ?? 'Tienda';
    return {
      id: Number(conv?.id ?? 0),
      vendedorId: Number(conv?.vendedorId ?? 1),
      vendedorNombreTienda: vendorName,
      vendedorLogo: conv?.vendedorLogo ?? '/img/frutosSecos.jpg',
      ultimoMensaje: conv?.ultimoMensaje ?? '',
      fechaUltimoMensaje: conv?.fechaUltimoMensaje ?? conv?.fechaCreacion ?? new Date().toISOString(),
      noLeidos: Number(conv?.noLeidos ?? 0),
      mensajes: []
    };
  }

  private normalizeMessage(msg: any): BuyerMessage {
    const sender = msg?.remitenteCorreo === this.authService.currentUserEmail() ? 'COMPRADOR' : 'VENDEDOR';
    return {
      id: Number(msg?.id ?? Math.floor(Math.random() * 100000)),
      remitente: sender as BuyerMessage['remitente'],
      contenido: msg?.contenido ?? '',
      fecha: msg?.fechaEnvio ?? msg?.fecha ?? new Date().toISOString(),
      leido: Boolean(msg?.leido ?? sender === 'COMPRADOR')
    };
  }

  private normalizeNotification(notif: any): BuyerNotification {
    return {
      id: Number(notif?.id ?? 0),
      tipo: (notif?.tipo ?? 'SISTEMA') as BuyerNotification['tipo'],
      titulo: notif?.titulo ?? 'Notificación',
      contenido: notif?.contenido ?? notif?.mensaje ?? '',
      fecha: notif?.fecha ?? notif?.fechaCreacion ?? new Date().toISOString(),
      leido: Boolean(notif?.leido)
    };
  }

  private refreshNotificationsFromBackend(): void {
    this.http.get<any[]>(`${this.baseUrl}/notificaciones`).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: notifications => {
        this.notifications.set(notifications.map(notif => this.normalizeNotification(notif)));
      }
    });
  }

  private refreshConversationsFromBackend(): void {
    this.http.get<any[]>(`${this.baseUrl}/chat/conversaciones`).pipe(
      catchError(() => of([]))
    ).subscribe({
      next: conversations => {
        const existing = new Map(this.conversations().map(conv => [conv.id, conv]));
        this.conversations.set(conversations.map(conv => {
          const normalized = this.normalizeConversation(conv);
          const previous = existing.get(normalized.id);
          return previous ? { ...normalized, mensajes: previous.mensajes } : normalized;
        }));
      }
    });
  }

  refreshRealtimeInbox(): void {
    this.refreshConversationsFromBackend();
    this.refreshNotificationsFromBackend();
  }

  loadBackendData(): Observable<void> {
    return forkJoin({
      profile: this.http.get<any>(`${this.baseUrl}/auth/profile`),
      orders: this.http.get<any[]>(`${this.baseUrl}/pedidos/mis-pedidos`),
      purchases: this.http.get<any[]>(`${this.baseUrl}/compras/mis-compras`),
      notifications: this.http.get<any[]>(`${this.baseUrl}/notificaciones`),
      conversations: this.http.get<any[]>(`${this.baseUrl}/chat/conversaciones`),
      favorites: this.http.get<any[]>(`${this.baseUrl}/productos/favoritos`)
    }).pipe(
      tap(({ profile, orders, purchases, notifications, conversations, favorites }) => {
        this.profile.set({
          nombres: profile?.nombres ?? this.profile().nombres,
          apellidos: profile?.apellidos ?? this.profile().apellidos,
          correo: profile?.correo ?? this.profile().correo,
          telefono: profile?.telefono ?? this.profile().telefono,
          foto: profile?.fotoPerfil ?? profile?.foto ?? this.profile().foto
        });
        const backendAddress = this.buildAddressFromProfile(profile);
        if (backendAddress) {
          this.addresses.set([backendAddress]);
        }
        this.orders.set(orders.map(order => this.normalizeOrder(order)));
        this.purchases.set((purchases ?? []).map((purchase: any) => this.normalizePurchase(purchase)));
        this.notifications.set(notifications.map(notif => this.normalizeNotification(notif)));
        this.conversations.set(conversations.map(conv => this.normalizeConversation(conv)));
        const normalizedFavorites = (favorites ?? []).map((fav: any) => ({
          id: Number(fav?.id ?? 0),
          nombre: fav?.nombre ?? '',
          descripcion: fav?.descripcion ?? '',
          sku: fav?.sku ?? '',
          precio: Number(fav?.precio ?? 0),
          stock: Number(fav?.stock ?? 0),
          categoriaNombre: fav?.categoriaNombre ?? fav?.categoria ?? 'Sin categoría',
          vendedorId: Number(fav?.vendedorId ?? 0),
          vendedorNombreTienda: fav?.vendedorNombreTienda ?? fav?.vendedorTienda ?? fav?.vendedorNombre ?? 'Tienda',
          imagenes: Array.isArray(fav?.imagenes)
            ? fav.imagenes.map((img: any) => ({
                id: Number(img?.id ?? 0) || undefined,
                url: typeof img === 'string' ? img : (img?.url ?? ''),
                principal: Boolean(img?.principal),
                ordenVisualizacion: Number(img?.ordenVisualizacion ?? 0)
              })).filter((img: any) => Boolean(img.url))
            : []
        }));
        this.favoriteProducts.set(normalizedFavorites);
        this.favorites.set(normalizedFavorites.map(fav => fav.id));
      }),
      map(() => void 0)
    );
  }

  // --- COMPUTED PROPERTIES FOR REACTIVE CART CALCULATIONS ---

  readonly cartCount = computed(() => {
    return this.cart().reduce((acc, item) => acc + item.cantidad, 0);
  });

  readonly cartSubtotal = computed(() => {
    return this.cart().reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  });

  readonly cartShipping = computed(() => {
    return this.cartGroups().reduce((acc, group) => {
      const shipping = group.subtotal < 150 ? 15.00 : 0.00;
      return acc + shipping;
    }, 0);
  });

  readonly cartTax = computed(() => {
    // 18% IGV incluido
    return this.cartSubtotal() * 0.18;
  });

  readonly cartTotal = computed(() => {
    return this.cartSubtotal() + this.cartShipping() + this.cartTax();
  });

  readonly cartGroups = computed<CheckoutVendorGroup[]>(() => {
    const groups = new Map<number, CheckoutVendorGroup>();

    for (const item of this.cart()) {
      const key = item.vendedorId;
      const current = groups.get(key) ?? {
        vendedorId: item.vendedorId,
        vendedorNombre: item.vendedorNombre,
        costoEnvio: 15,
        items: [],
        subtotal: 0,
        impuesto: 0,
        total: 0
      };
      current.items.push(item);
      groups.set(key, current);
    }

    return Array.from(groups.values()).map(group => {
      const subtotal = group.items.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
      const costoEnvio = subtotal < 150 ? 15 : 0;
      const impuesto = subtotal * 0.18;
      const total = subtotal + impuesto + costoEnvio;
      return { ...group, subtotal, impuesto, costoEnvio, total };
    });
  });

  readonly unreadNotificationsCount = computed(() => {
    return this.notifications().filter(n => !n.leido).length;
  });

  readonly unreadChatsCount = computed(() => {
    return this.conversations().reduce((acc, conv) => acc + conv.noLeidos, 0);
  });

  // --- CART OPERATIONS ---

  addToCart(prod: any, qty: number = 1): void {
    const currentCart = this.cart();
    const existingIndex = currentCart.findIndex(item => item.productoId === prod.id);

    if (existingIndex > -1) {
      this.cart.update(list => list.map((item, idx) => {
        if (idx === existingIndex) {
          return { ...item, cantidad: item.cantidad + qty };
        }
        return item;
      }));
    } else {
      const rawImg = prod.imagenes?.[0];
      const imgUrl = typeof rawImg === 'string' ? rawImg : (rawImg?.url || '/img/aceite-coco.jpeg');

      const newItem: CartItem = {
        productoId: prod.id,
        nombre: prod.nombre,
        sku: prod.sku,
        precio: prod.precio,
        cantidad: qty,
        imagen: imgUrl,
        vendedorId: Number(prod.vendedorId || prod.vendorId || 1),
        vendedorNombre: prod.vendedorNombre || prod.tiendaNombre || prod.vendedorNombreTienda || 'Café Altomayo Gourmet'
      };
      this.cart.update(list => [...list, newItem]);
    }

    // Registrar notificación de éxito o disparar alerta
    console.log(`Producto añadido al carrito: ${prod.nombre}`);
  }

  updateCartQty(productoId: number, qty: number): void {
    if (qty <= 0) {
      this.removeFromCart(productoId);
      return;
    }

    this.cart.update(list => list.map(item => {
      if (item.productoId === productoId) {
        return { ...item, cantidad: qty };
      }
      return item;
    }));
  }

  removeFromCart(productoId: number): void {
    this.cart.update(list => list.filter(item => item.productoId !== productoId));
  }

  clearCart(): void {
    this.cart.set([]);
  }

  showToast(message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success'): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    
    this.activeToast.set({ message, type, visible: true });
    
    this.toastTimeout = setTimeout(() => {
      const current = this.activeToast();
      if (current) {
        this.activeToast.set({ ...current, visible: false });
      }
      
      this.toastTimeout = setTimeout(() => {
        this.activeToast.set(null);
      }, 400);
    }, 3000);
  }

  // --- FAVORITES OPERATIONS ---

  toggleFavorite(productId: number): void {
    const list = this.favorites();
    if (list.includes(productId)) {
      this.http.delete<void>(`${this.baseUrl}/productos/favoritos/${productId}`).subscribe({
        next: () => {
          this.favorites.set(list.filter(id => id !== productId));
          this.favoriteProducts.update(products => products.filter(p => p.id !== productId));
        }
      });
    } else {
      this.http.post<void>(`${this.baseUrl}/productos/favoritos/${productId}`, null).subscribe({
        next: () => {
          this.favorites.set([...list, productId]);
          this.http.get<any>(`${this.baseUrl}/productos/${productId}`).subscribe({
            next: (prod) => {
              const normalized: FavoriteProduct = {
                id: Number(prod?.id ?? productId),
                nombre: prod?.nombre ?? '',
                descripcion: prod?.descripcion ?? '',
                sku: prod?.sku ?? '',
                precio: Number(prod?.precio ?? 0),
                stock: Number(prod?.stock ?? 0),
                categoriaNombre: prod?.categoriaNombre ?? prod?.categoria ?? 'Sin categoría',
                vendedorId: Number(prod?.vendedorId ?? 0),
                vendedorNombreTienda: prod?.vendedorNombreTienda ?? prod?.vendedorTienda ?? prod?.vendedorNombre ?? 'Tienda',
                imagenes: Array.isArray(prod?.imagenes)
                  ? prod.imagenes.map((img: any) => ({
                      id: Number(img?.id ?? 0) || undefined,
                      url: typeof img === 'string' ? img : (img?.url ?? ''),
                      principal: Boolean(img?.principal),
                      ordenVisualizacion: Number(img?.ordenVisualizacion ?? 0)
                    })).filter((img: any) => Boolean(img.url))
                  : []
              };
              this.favoriteProducts.update(products => {
                if (products.some(p => p.id === normalized.id)) return products;
                return [normalized, ...products];
              });
            }
          });
        }
      });
    }
  }

  isFavorite(productId: number): boolean {
    return this.favorites().includes(productId);
  }

  // --- ADDRESS OPERATIONS ---

  private buildAddressFromProfile(profile: any): Address | null {
    const direccion = String(profile?.direccion ?? '').trim();
    if (!direccion) {
      return null;
    }

    return {
      id: 1,
      nombreReferencia: 'Dirección principal',
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: '',
      direccion,
      codigoPostal: '',
      referencia: '',
      predeterminada: true
    };
  }

  addAddress(newAddr: Omit<Address, 'id'>): Observable<Address> {
    const addr: Address = {
      ...newAddr,
      id: Math.max(...this.addresses().map(a => a.id), 0) + 1
    };

    return of(addr).pipe(
      delay(600),
      tap(item => {
        if (item.predeterminada) {
          this.addresses.update(list => list.map(a => ({ ...a, predeterminada: false })));
        }
        this.addresses.update(list => [...list, item]);
      })
    );
  }

  updateAddress(id: number, updated: Partial<Address>): Observable<Address> {
    const original = this.addresses().find(a => a.id === id);
    if (!original) return throwError(() => new Error('Dirección no encontrada'));

    const final = { ...original, ...updated } as Address;

    return of(final).pipe(
      delay(500),
      tap(item => {
        if (item.predeterminada) {
          this.addresses.update(list => list.map(a => a.id === id ? item : { ...a, predeterminada: false }));
        } else {
          this.addresses.update(list => list.map(a => a.id === id ? item : a));
        }
      })
    );
  }

  deleteAddress(id: number): Observable<void> {
    return of(void 0).pipe(
      delay(400),
      tap(() => {
        this.addresses.update(list => list.filter(a => a.id !== id));
      })
    );
  }

  // --- PROFILE & SETTINGS ---

  persistPrimaryAddress(address: Address): Observable<any> {
    const formattedAddress = [
      address.nombreReferencia,
      address.direccion,
      address.distrito,
      address.provincia,
      address.departamento,
      address.codigoPostal,
      address.referencia
    ]
      .map(value => String(value ?? '').trim())
      .filter(Boolean)
      .join(' | ');

    return this.authService.updateProfile({ direccion: formattedAddress }).pipe(
      tap(profile => {
        this.profile.set({
          ...this.profile(),
          correo: profile?.correo ?? this.profile().correo
        });
      })
    );
  }

  updateProfile(profileData: BuyerProfile): Observable<BuyerProfile> {
    return of(profileData).pipe(
      delay(600),
      tap(data => this.profile.set(data))
    );
  }

  updatePreferences(prefData: any): Observable<any> {
    return of(prefData).pipe(
      delay(400),
      tap(data => this.preferences.set(data))
    );
  }

  // --- CHECKOUT & ORDER CREATION ---

  submitOrder(paymentMethod: string, address: Address, paymentDetails?: { cardNumber?: string; cardCvv?: string; cardExpiry?: string }): Observable<BuyerOrder> {
    return this.submitGroupedOrder(paymentMethod, address, paymentDetails).pipe(
      map(result => result.pedidos[0])
    );
  }

  submitGroupedOrder(paymentMethod: string, address: Address, paymentDetails?: { cardNumber?: string; cardCvv?: string; cardExpiry?: string }): Observable<GroupedCheckoutResult> {
    const groups = this.cartGroups();
    const request = {
      grupos: groups.map(group => ({
        vendedorId: group.vendedorId,
        costoEnvio: group.costoEnvio,
        detalles: group.items.map(item => ({
          productoId: item.productoId,
          cantidad: item.cantidad
        }))
      }))
    };

    let backendPaymentMethod = paymentMethod;
    if (paymentMethod === 'STRIPE') {
      const cleanCard = (paymentDetails?.cardNumber || '').replace(/\s+/g, '');
      backendPaymentMethod = cleanCard.startsWith('5') ? 'MASTERCARD' : 'VISA';
    }

    return this.http.post<any>(`${this.baseUrl}/pagos/compra-agrupada`, {
      ...request,
      metodoPago: backendPaymentMethod,
      numeroTarjeta: paymentDetails?.cardNumber,
      cvv: paymentDetails?.cardCvv,
      fechaExpiracion: paymentDetails?.cardExpiry
    }).pipe(
      map(result => this.normalizePurchase(result, {
        metodoPago: backendPaymentMethod,
        direccionEntrega: address
      })),
      tap(result => {
        this.orders.update(list => [...result.pedidos, ...list]);
        this.purchases.update(list => [result, ...list]);
        this.clearCart();
        const newNotif: BuyerNotification = {
          id: Math.floor(Math.random() * 100000),
          tipo: 'PEDIDO',
          titulo: `¡Compra exitosa!`,
          contenido: `Tu compra fue procesada en ${result.pedidos.length} pedido(s) separados por tienda.`,
          fecha: new Date().toISOString(),
          leido: false
        };
        this.notifications.update(notifs => [newNotif, ...notifs]);
      })
    );
  }

  exportPurchasePdf(purchaseId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/compras/${purchaseId}/pdf`, {
      responseType: 'blob'
    });
  }

  // --- CHAT WITH VENDOR ---

  loadMessageHistory(conversationId: number): Observable<BuyerMessage[]> {
    return this.http.get<any[]>(`${this.baseUrl}/chat/conversaciones/${conversationId}/mensajes`).pipe(
      map(msgs => msgs.map(m => this.normalizeMessage(m))),
      tap(msgs => {
        this.conversations.update(list => list.map(c => {
          if (c.id === conversationId) {
            return { ...c, mensajes: msgs };
          }
          return c;
        }));
      })
    );
  }

  openConversation(vendedorId: number): Observable<BuyerConversation> {
    const existing = this.conversations().find(c => c.vendedorId === vendedorId);
    if (existing) {
      return of(existing);
    }

    return this.http.post<any>(`${this.baseUrl}/chat/conversaciones`, { vendedorId }).pipe(
      map(conv => this.normalizeConversation(conv)),
      tap(conv => {
        this.conversations.update(list => {
          const withoutDuplicate = list.filter(c => c.id !== conv.id && c.vendedorId !== conv.vendedorId);
          return [conv, ...withoutDuplicate];
        });
      })
    );
  }

  private handleIncomingSocketMessage(payload: any): void {
    const { conversacionId, data } = payload;
    if (!conversacionId || !data) return;

    const isBuyer = data.remitenteCorreo === this.authService.currentUserEmail();
    const msg = this.normalizeMessage(data);

    this.conversations.update(list => {
      const exists = list.some(c => c.id === conversacionId);
      if (!exists) {
        // Trigger a reload of conversation list from server to pick up new conversation channel
        this.loadBackendData().subscribe();
        return list;
      }
      return list.map(c => {
        if (c.id === conversacionId) {
          // Avoid duplicate messages
          if (c.mensajes.some(m => m.id === msg.id)) {
            return c;
          }

          if (!isBuyer) {
            this.showToast(`Mensaje de ${c.vendedorNombreTienda}: "${msg.contenido}"`, 'info');
          }

          return {
            ...c,
            ultimoMensaje: msg.contenido,
            fechaUltimoMensaje: msg.fecha,
            noLeidos: isBuyer ? c.noLeidos : c.noLeidos + 1,
            mensajes: [...c.mensajes, msg]
          };
        }
        return c;
      });
    });
  }

  sendChatMessage(vendedorId: number, content: string): Observable<BuyerMessage> {
    const ensureConversation = (existing?: BuyerConversation) => {
      if (existing) return of(existing);
        return this.http.post<any>(`${this.baseUrl}/chat/conversaciones`, { vendedorId }).pipe(
        map(conv => this.normalizeConversation({ ...conv, vendedorId })),
        tap(() => this.refreshNotificationsFromBackend())
      );
    };

    const activeConv = this.conversations().find(c => c.vendedorId === vendedorId);
    return ensureConversation(activeConv).pipe(
      switchMap(conv => {
        // Try sending via WebSocket first
        const sentViaSocket = this.chatService.sendMessageViaSocket(
          conv.id,
          this.authService.currentUserEmail()!,
          content
        );

        if (sentViaSocket) {
          // Return a temp message instantly.
          // The socket messageReceived$ listener will handle appending the actual ACK-ed message.
          const tempMsg: BuyerMessage = {
            id: Math.floor(Math.random() * -100000),
            remitente: 'COMPRADOR',
            contenido: content,
            fecha: new Date().toISOString(),
            leido: false
          };
          return of(tempMsg);
        }

        // Fallback to HTTP POST if WebSocket connection is not open
        return this.http.post<any>(`${this.baseUrl}/chat/conversaciones/${conv.id}/mensajes`, { contenido: content }).pipe(
          map(msg => this.normalizeMessage(msg)),
          tap(msg => {
            this.conversations.update(list => list.map(c => {
              if (c.id === conv.id) {
                if (c.mensajes.some(m => m.id === msg.id)) return c;
                return {
                  ...c,
                  ultimoMensaje: msg.contenido,
                  fechaUltimoMensaje: msg.fecha,
                  mensajes: [...c.mensajes, msg]
                };
              }
              return c;
            }));
          })
        );
      })
    );
  }

  markNotificationsRead(): void {
    this.notifications().filter(n => !n.leido).forEach(n => this.http.put<void>(`${this.baseUrl}/notificaciones/${n.id}/leer`, null).subscribe({
      next: () => {
        this.notifications.update(list => list.map(item => item.id === n.id ? { ...item, leido: true } : item));
        this.refreshNotificationsFromBackend();
      }
    }));
  }

  markNotificationRead(id: number): void {
    const current = this.notifications().find(n => n.id === id);
    if (!current || current.leido) return;

    this.http.put<void>(`${this.baseUrl}/notificaciones/${id}/leer`, null).subscribe({
      next: () => {
        this.notifications.update(list => list.map(item => item.id === id ? { ...item, leido: true } : item));
        this.refreshNotificationsFromBackend();
      }
    });
  }

  resolveConversationIdFromNotification(notification: BuyerNotification): number | null {
    const title = String(notification?.titulo ?? '').toLowerCase();
    const content = String(notification?.contenido ?? '').toLowerCase();
    const conversations = this.conversations();

    if (notification.tipo !== 'CHAT') {
      return null;
    }

    if (title.startsWith('chat iniciado con')) {
      const vendorName = title.replace(/^chat iniciado con\s+/i, '').trim();
      const match = conversations.find(conv =>
        conv.vendedorNombreTienda.toLowerCase() === vendorName ||
        conv.vendedorNombreTienda.toLowerCase().includes(vendorName) ||
        content.includes(conv.vendedorNombreTienda.toLowerCase())
      );
      return match?.id ?? null;
    }

    if (title.startsWith('respuesta de') || title.startsWith('nuevo mensaje de')) {
      const vendorName = title
        .replace(/^respuesta de\s+/i, '')
        .replace(/^nuevo mensaje de\s+/i, '')
        .trim();

      const match = conversations.find(conv =>
        conv.vendedorNombreTienda.toLowerCase() === vendorName ||
        conv.vendedorNombreTienda.toLowerCase().includes(vendorName) ||
        content.includes(conv.vendedorNombreTienda.toLowerCase())
      );

      return match?.id ?? null;
    }

    return null;
  }

  deleteNotification(id: number): void {
    this.http.delete<void>(`${this.baseUrl}/notificaciones/${id}`).subscribe({
      next: () => {
        this.notifications.update(list => list.filter(n => n.id !== id));
      }
    });
  }
}
