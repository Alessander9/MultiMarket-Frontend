import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { delay, tap, map, switchMap } from 'rxjs/operators';
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
  readonly favorites = signal<number[]>([101, 104]); // IDs de productos favoritos por defecto

  // 3. Direcciones
  readonly addresses = signal<Address[]>([
    { id: 1, nombreReferencia: 'Mi Casa', departamento: 'Lima', provincia: 'Lima', distrito: 'Miraflores', direccion: 'Av. Larco 452, Dpto 502', codigoPostal: '15074', referencia: 'Frente al Parque Kennedy', predeterminada: true },
    { id: 2, nombreReferencia: 'Oficina Trabajo', departamento: 'Lima', provincia: 'Lima', distrito: 'San Isidro', direccion: 'Calle Los Pinos 142, Piso 8', codigoPostal: '15046', referencia: 'A espaldas del Centro Financiero', predeterminada: false }
  ]);

  // 4. Perfil Comprador
  readonly profile = signal<BuyerProfile>({
    nombres: 'Maria Alejandra',
    apellidos: 'Torres Perez',
    correo: 'comprador@gmail.com',
    telefono: '+51 944 678 901',
    foto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80'
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
  readonly orders = signal<BuyerOrder[]>([
    {
      id: 7001,
      numeroPedido: 'PED-7750',
      fecha: '2026-05-28T09:45:00-05:00',
      vendedorId: 1,
      vendedorNombreTienda: 'Café Altomayo Gourmet',
      items: [
        { productoId: 101, nombre: 'Café Blend Premium - Grano 1kg', sku: 'CAF-BLE-PRE-1KG', precio: 59.90, cantidad: 2, imagen: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=100', vendedorId: 1, vendedorNombre: 'Café Altomayo Gourmet' }
      ],
      subtotal: 119.80,
      envio: 15.00,
      impuesto: 21.56,
      total: 156.36,
      estado: 'ENTREGADO',
      metodoPago: 'MASTERCARD',
      direccionEntrega: { departamento: 'Lima', distrito: 'Miraflores', direccion: 'Av. Larco 452, Dpto 502' },
      seguimiento: [
        { fecha: '2026-05-28T09:45:00-05:00', descripcion: 'Pedido registrado y pagado con éxito.', completado: true },
        { fecha: '2026-05-28T14:20:00-05:00', descripcion: 'Preparado y empacado en almacén del vendedor.', completado: true },
        { fecha: '2026-05-29T10:00:00-05:00', descripcion: 'En tránsito con courier local.', completado: true },
        { fecha: '2026-05-30T15:30:00-05:00', descripcion: 'Pedido entregado en dirección de destino.', completado: true }
      ]
    },
    {
      id: 7002,
      numeroPedido: 'PED-7762',
      fecha: '2026-05-30T11:00:00-05:00',
      vendedorId: 1,
      vendedorNombreTienda: 'Café Altomayo Gourmet',
      items: [
        { productoId: 103, nombre: 'Café Espresso Roast - Grano 500g', sku: 'CAF-ESP-ROA-500G', precio: 38.00, cantidad: 1, imagen: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=100', vendedorId: 1, vendedorNombre: 'Café Altomayo Gourmet' }
      ],
      subtotal: 38.00,
      envio: 12.00,
      impuesto: 6.84,
      total: 56.84,
      estado: 'ENVIADO',
      metodoPago: 'YAPE',
      direccionEntrega: { departamento: 'Lima', distrito: 'Miraflores', direccion: 'Av. Larco 452, Dpto 502' },
      seguimiento: [
        { fecha: '2026-05-30T11:00:00-05:00', descripcion: 'Pedido registrado y pagado con éxito.', completado: true },
        { fecha: '2026-05-30T16:00:00-05:00', descripcion: 'Preparado en almacén de origen.', completado: true },
        { fecha: '2026-05-31T09:30:00-05:00', descripcion: 'Despachado en ruta de reparto a destino.', completado: true },
        { fecha: '', descripcion: 'Confirmación de recepción por parte del courier.', completado: false }
      ]
    }
  ]);

  // 7. Chats y Conversaciones
  readonly conversations = signal<BuyerConversation[]>([
    {
      id: 401,
      vendedorId: 1,
      vendedorNombreTienda: 'Café Altomayo Gourmet',
      vendedorLogo: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=150&auto=format&fit=crop&q=80',
      ultimoMensaje: 'Hola, acabo de realizar mi pedido. ¿Cuándo se despacha?',
      fechaUltimoMensaje: '2026-05-31T20:45:00-05:00',
      noLeidos: 0,
      mensajes: [
        { id: 1, remitente: 'COMPRADOR', contenido: 'Buenas tardes. Quisiera consultar sobre el Café Blend Premium en grano.', fecha: '2026-05-31T14:10:00-05:00', leido: true },
        { id: 2, remitente: 'VENDEDOR', contenido: '¡Hola Maria! Un gusto saludarte. El Café Blend Premium está tostado hace solo 3 días, tiene un perfil excelente. ¿Deseas molido o en grano entero?', fecha: '2026-05-31T14:15:00-05:00', leido: true },
        { id: 3, remitente: 'COMPRADOR', contenido: 'Excelente. Lo prefiero en grano. Haré la compra ahora mismo.', fecha: '2026-05-31T14:20:00-05:00', leido: true },
        { id: 4, remitente: 'COMPRADOR', contenido: 'Hola, acabo de realizar mi pedido. ¿Cuándo se despacha?', fecha: '2026-05-31T20:45:00-05:00', leido: true }
      ]
    }
  ]);

  // 8. Notificaciones
  readonly notifications = signal<BuyerNotification[]>([
    { id: 1, tipo: 'PEDIDO', titulo: '¡Pedido #PED-7762 Despachado!', contenido: 'Tu pedido conteniendo "Café Espresso Roast" ya se encuentra en camino con el transportista.', fecha: '2026-05-31T09:30:00-05:00', leido: false },
    { id: 2, tipo: 'PAGO', titulo: 'Pago Verificado con Éxito', contenido: 'El pago por YAPE de S/ 56.84 por tu orden PED-7762 ha sido verificado satisfactoriamente.', fecha: '2026-05-30T11:05:00-05:00', leido: true },
    { id: 3, tipo: 'PROMOCION', titulo: '20% Descuento en Chocolates de Cusco', contenido: 'Solo por este fin de semana, aprovecha 20% de descuento en tabletas de chocolate artesanal.', fecha: '2026-05-29T08:00:00-05:00', leido: false },
    { id: 4, tipo: 'CHAT', titulo: 'Nuevo mensaje de vendedor', contenido: 'Café Altomayo Gourmet respondió a tu consulta en el chat.', fecha: '2026-05-31T14:15:00-05:00', leido: true }
  ]);

  // 9. Vendedores recomendados
  readonly topVendors = signal<VendorMini[]>([
    { id: 1, nombre: 'Café Altomayo Gourmet', region: 'San Martín', rating: 4.8, logo: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=100&q=80' },
    { id: 2, nombre: 'Chocolates El Ceibo', region: 'Amazonas', rating: 4.7, logo: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=100&q=80' },
    { id: 3, nombre: 'Artesanías Andinas', region: 'Cusco', rating: 4.9, logo: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=100&q=80' }
  ]);

  private normalizeOrder(order: any): BuyerOrder {
    return {
      id: Number(order?.id ?? 0),
      numeroPedido: order?.numeroPedido ?? '',
      fecha: order?.fechaPedido ?? order?.fecha ?? new Date().toISOString(),
      vendedorId: Number(order?.vendedorId ?? this.cart()[0]?.vendedorId ?? 1),
      vendedorNombreTienda: order?.vendedorNombreTienda ?? order?.vendedorTienda ?? order?.vendedorNombre ?? 'Tienda',
      items: (order?.detalles ?? order?.items ?? []).map((item: any, idx: number) => ({
        productoId: Number(item?.productoId ?? 0),
        nombre: item?.productoNombre ?? item?.nombre ?? '',
        sku: item?.sku ?? '',
        precio: Number(item?.precioUnitario ?? item?.precio ?? 0),
        cantidad: Number(item?.cantidad ?? 0),
        imagen: item?.imagen ?? item?.imagenes?.[0] ?? 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=100',
        vendedorId: Number(order?.vendedorId ?? 1),
        vendedorNombre: order?.vendedorNombreTienda ?? order?.vendedorTienda ?? order?.vendedorNombre ?? 'Tienda'
      })),
      subtotal: Number(order?.subtotal ?? 0),
      envio: Number(order?.costoEnvio ?? order?.envio ?? 0),
      impuesto: Number(order?.impuesto ?? 0),
      total: Number(order?.total ?? 0),
      estado: (order?.estado ?? 'PENDIENTE') as BuyerOrder['estado'],
      metodoPago: order?.metodoPago ?? '',
      direccionEntrega: order?.direccionEntrega ?? {},
      seguimiento: (order?.seguimiento ?? []).map((s: any) => ({
        fecha: s?.fecha ?? new Date().toISOString(),
        descripcion: s?.descripcion ?? '',
        completado: Boolean(s?.completado)
      }))
    };
  }

  private normalizeConversation(conv: any): BuyerConversation {
    const vendorName = conv?.vendedorTienda ?? conv?.vendedorNombreTienda ?? 'Tienda';
    return {
      id: Number(conv?.id ?? 0),
      vendedorId: Number(conv?.vendedorId ?? 1),
      vendedorNombreTienda: vendorName,
      vendedorLogo: conv?.vendedorLogo ?? 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=150&auto=format&fit=crop&q=80',
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

  loadBackendData(): Observable<void> {
    return forkJoin({
      profile: this.http.get<any>(`${this.baseUrl}/auth/profile`),
      orders: this.http.get<any[]>(`${this.baseUrl}/pedidos/mis-pedidos`),
      notifications: this.http.get<any[]>(`${this.baseUrl}/notificaciones`),
      conversations: this.http.get<any[]>(`${this.baseUrl}/chat/conversaciones`),
      favorites: this.http.get<any[]>(`${this.baseUrl}/productos/favoritos`)
    }).pipe(
      tap(({ profile, orders, notifications, conversations, favorites }) => {
        this.profile.set({
          nombres: profile?.nombres ?? this.profile().nombres,
          apellidos: profile?.apellidos ?? this.profile().apellidos,
          correo: profile?.correo ?? this.profile().correo,
          telefono: profile?.telefono ?? this.profile().telefono,
          foto: profile?.fotoPerfil ?? profile?.foto ?? this.profile().foto
        });
        this.orders.set(orders.map(order => this.normalizeOrder(order)));
        this.notifications.set(notifications.map(notif => this.normalizeNotification(notif)));
        this.conversations.set(conversations.map(conv => this.normalizeConversation(conv)));
        this.favorites.set((favorites ?? []).map((fav: any) => Number(fav?.id ?? fav?.productoId ?? fav)));
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
    // Tarifa plana con envío gratis desde S/ 150 de subtotal
    return this.cart().length > 0 && this.cartSubtotal() < 150 ? 15.00 : 0.00;
  });

  readonly cartTax = computed(() => {
    // 18% IGV incluido
    return this.cartSubtotal() * 0.18;
  });

  readonly cartTotal = computed(() => {
    return this.cartSubtotal() + this.cartShipping() + this.cartTax();
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
      const imgUrl = typeof rawImg === 'string' ? rawImg : (rawImg?.url || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200');

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
        next: () => this.favorites.set(list.filter(id => id !== productId))
      });
    } else {
      this.http.post<void>(`${this.baseUrl}/productos/favoritos/${productId}`, null).subscribe({
        next: () => this.favorites.set([...list, productId])
      });
    }
  }

  isFavorite(productId: number): boolean {
    return this.favorites().includes(productId);
  }

  // --- ADDRESS OPERATIONS ---

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
    const request = {
      vendedorId: this.cart()[0]?.vendedorId || 1,
      costoEnvio: this.cartShipping(),
      detalles: this.cart().map(item => ({
        productoId: item.productoId,
        cantidad: item.cantidad
      }))
    };

    let backendPaymentMethod = paymentMethod;
    if (paymentMethod === 'STRIPE') {
      const cleanCard = (paymentDetails?.cardNumber || '').replace(/\s+/g, '');
      if (cleanCard.startsWith('5')) {
        backendPaymentMethod = 'MASTERCARD';
      } else {
        backendPaymentMethod = 'VISA';
      }
    }

    return this.http.post<any>(`${this.baseUrl}/pedidos`, request).pipe(
      switchMap(order => this.http.post<any>(`${this.baseUrl}/pagos`, {
        pedidoId: order.id,
        metodoPago: backendPaymentMethod,
        numeroTarjeta: paymentDetails?.cardNumber,
        cvv: paymentDetails?.cardCvv,
        fechaExpiracion: paymentDetails?.cardExpiry
      }).pipe(
        switchMap(() => this.http.get<any>(`${this.baseUrl}/pedidos/${order.id}`))
      )),
      map(order => this.normalizeOrder(order)),
      tap(order => {
        this.orders.update(list => [order, ...list]);
        this.clearCart();
        const newNotif: BuyerNotification = {
          id: Math.floor(Math.random() * 100000),
          tipo: 'PEDIDO',
          titulo: `¡Compra exitosa ${order.numeroPedido}!`,
          contenido: `Tu pago de S/ ${order.total.toFixed(2)} ha sido procesado. El vendedor ya prepara tu despacho.`,
          fecha: new Date().toISOString(),
          leido: false
        };
        this.notifications.update(notifs => [newNotif, ...notifs]);
      })
    );
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
        map(conv => this.normalizeConversation({ ...conv, vendedorId }))
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
      next: () => this.notifications.update(list => list.map(item => item.id === n.id ? { ...item, leido: true } : item))
    }));
  }

  deleteNotification(id: number): void {
    this.notifications.update(list => list.filter(n => n.id !== id));
  }
}
