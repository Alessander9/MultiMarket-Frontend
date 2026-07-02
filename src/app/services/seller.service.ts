import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { catchError, tap, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ChatService } from './chat.service';

// --- INTERFACES ---

export interface StoreProfile {
  nombre: string;
  descripcion: string;
  region: string;
  direccion: string;
  logo: string;
  banner: string;
  correo: string;
  telefono: string;
  calificacionPromedio?: number;
  redesSociales: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    website?: string;
  };
}

export interface SellerProduct {
  id: number;
  vendorId?: number;
  nombre: string;
  descripcion: string;
  sku: string;
  categoria: string;
  precio: number;
  stock: number;
  peso: number;
  estado: 'ACTIVO' | 'INACTIVO' | 'SIN_STOCK';
  imagenes: string[];
}

export interface InventoryMovement {
  id: number;
  fecha: string;
  productoId: number;
  productoNombre: string;
  sku: string;
  cantidad: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  observacion: string;
}

export interface OrderItem {
  id: number;
  productoId: number;
  productoNombre: string;
  sku: string;
  precio: number;
  cantidad: number;
  imagen: string;
}

export interface SellerOrder {
  id: number;
  numeroPedido: string;
  fecha: string;
  clienteNombre: string;
  clienteCorreo: string;
  items: OrderItem[];
  subtotal: number;
  impuesto?: number;
  envio: number;
  total: number;
  estado: 'PENDIENTE' | 'PROCESANDO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
  metodoPago: string;
  direccionEntrega: string;
}

export interface SellerCustomer {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  comprasTotales: number;
  ultimaCompraFecha: string;
  montoAcumulado: number;
  ciudad: string;
}

export interface SellerMessage {
  id: number;
  remitente: 'COMPRADOR' | 'VENDEDOR';
  contenido: string;
  fecha: string;
  leido: boolean;
}

export interface SellerConversation {
  id: number;
  compradorNombre: string;
  compradorCorreo: string;
  compradorAvatar: string;
  ultimoMensaje: string;
  fechaUltimoMensaje: string;
  noLeidos: number;
  mensajes: SellerMessage[];
}

export interface XmlImportLog {
  id: number;
  fecha: string;
  archivoNombre: string;
  registrosProcesados: number;
  registrosCreados: number;
  registrosActualizados: number;
  registrosFallidos: number;
  estado: 'EXITOSO' | 'PARCIAL' | 'FALLIDO';
  detallesErrores?: string[];
}

export interface ExportLog {
  id: number;
  fecha: string;
  tipo: 'JSON' | 'XML';
  archivoNombre: string;
  registrosExportados: number;
  urlDescarga: string;
}

export interface SellerPayout {
  id: number;
  codigoOperacion: string;
  fecha: string;
  monto: number;
  metodo: string;
  estado: 'LIQUIDADO' | 'PROCESANDO' | 'RETENIDO';
  cuentaDestino: string;
}

export interface SellerPaymentRecord {
  id: number;
  monto: number;
  metodoPago: string;
  estadoPago: string;
  fechaPago: string;
  codigoOperacion: string;
  pedidoId: number;
  numeroPedido: string;
}

export interface SellerNotification {
  id: number;
  tipo: 'PEDIDO' | 'PAGO' | 'CHAT' | 'SISTEMA';
  titulo: string;
  contenido: string;
  fecha: string;
  leido: boolean;
}

export interface SellerSettings {
  cuenta: {
    nombrePersonal: string;
    correo: string;
    telefono: string;
    cargo: string;
  };
  seguridad: {
    dobleFactor: boolean;
    ultimaSesion: string;
  };
  preferencias: {
    idioma: 'es' | 'en';
    zonaHoraria: string;
    notificacionesEmail: boolean;
    notificacionesChat: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SellerService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly baseUrl = environment.apiUrl;
  private storeId: number | null = null;
  readonly backendLoaded = signal(false);

  constructor() {
    this.chatService.messageReceived$.subscribe(payload => {
      this.handleIncomingSocketMessage(payload);
    });
  }

  // --- REACTIVE STATE VIA SIGNALS ---

  // 1. Tienda Profile
  readonly storeProfile = signal<StoreProfile>({
    nombre: '',
    descripcion: '',
    region: '',
    direccion: '',
    logo: '',
    banner: '',
    correo: this.authService.currentUserEmail() ?? '',
    telefono: '',
    calificacionPromedio: 0,
    redesSociales: {
      facebook: '',
      instagram: '',
      twitter: '',
      website: ''
    }
  });

  // 2. Productos
  readonly products = signal<SellerProduct[]>([]);

  // 3. Movimientos de Inventario
  readonly inventoryMovements = signal<InventoryMovement[]>([]);

  // 4. Pedidos
  readonly orders = signal<SellerOrder[]>([]);

  // 5. Clientes
  readonly customers = signal<SellerCustomer[]>([]);

  // 6. Chat & Mensajes
  readonly conversations = signal<SellerConversation[]>([]);

  // 7. Importaciones XML
  readonly xmlImports = signal<XmlImportLog[]>([]);

  // 8. Exportaciones
  readonly exports = signal<ExportLog[]>([]);

  // 9. Pagos & Liquidaciones
  readonly payouts = signal<SellerPayout[]>([]);
  readonly payments = signal<SellerPaymentRecord[]>([]);

  // 10. Notificaciones
  readonly notifications = signal<SellerNotification[]>([]);

  // 11. Configuraciones
  readonly settings = signal<SellerSettings>({
    cuenta: {
      nombrePersonal: this.buildDisplayNameFromSession(),
      correo: this.authService.currentUserEmail() ?? '',
      telefono: '',
      cargo: this.authService.currentUserRoles().includes('VENDEDOR') ? 'Propietario Tienda' : 'Usuario'
    },
    seguridad: {
      dobleFactor: false,
      ultimaSesion: new Date().toISOString()
    },
    preferencias: {
      idioma: 'es',
      zonaHoraria: 'America/Lima (UTC-5)',
      notificacionesEmail: true,
      notificacionesChat: true
    }
  });

  // --- STATS / COMPUTED SIGNALS ---

  readonly unreadChatsCount = computed(() => {
    return this.conversations().reduce((acc, conv) => acc + conv.noLeidos, 0);
  });

  readonly unreadNotificationsCount = computed(() => {
    return this.notifications().filter(n => !n.leido).length;
  });

  readonly lowStockProductsCount = computed(() => {
    return this.products().filter(p => p.stock > 0 && p.stock <= 10).length;
  });

  readonly pendingOrdersCount = computed(() => {
    return this.orders().filter(o => o.estado === 'PENDIENTE').length;
  });

  readonly salesToday = computed(() => this.sumOrdersForDate(new Date()));
  readonly salesMonth = computed(() => this.sumOrdersForMonth(new Date()));
  readonly activeProductsCount = computed(() => this.products().filter(p => p.estado === 'ACTIVO').length);
  readonly deliveredOrdersCount = computed(() => this.orders().filter(o => o.estado === 'ENTREGADO').length);
  readonly newCustomersCount = computed(() => this.countUniqueCustomersForMonth(new Date()));
  readonly storeRating = computed(() => Number(this.storeProfile().calificacionPromedio ?? 0));
  readonly categories = signal<{ id: number; nombre: string }[]>([]);
  readonly salesTodayTrend = computed(() => this.buildTrendLabel(this.sumOrdersForDate(new Date()), this.sumOrdersForDate(this.addDays(new Date(), -1)), 'vs ayer'));
  readonly salesMonthTrend = computed(() => this.buildTrendLabel(this.sumOrdersForMonth(new Date()), this.sumOrdersForMonth(this.addMonths(new Date(), -1)), 'vs mes ant.'));
  readonly deliveredOrdersTrend = computed(() => {
    const total = this.orders().length;
    const delivered = this.deliveredOrdersCount();
    const rate = total > 0 ? Math.round((delivered * 1000) / total) / 10 : 0;
    return `${rate.toFixed(1)}% efectividad`;
  });
  readonly newCustomersTrend = computed(() => {
    const count = this.newCustomersCount();
    return count > 0 ? `+${count} este mes` : 'Sin altas este mes';
  });
  readonly storeRatingTrend = computed(() => {
    const rating = this.storeRating();
    return rating > 0 ? `${this.orders().length} pedidos analizados` : 'Sin calificaciones aún';
  });

  private normalizeStoreProfile(store: any): StoreProfile {
    this.storeId = store?.id ?? this.storeId;
    return {
      nombre: store?.nombreTienda ?? this.storeProfile().nombre,
      descripcion: store?.descripcion ?? this.storeProfile().descripcion,
      region: store?.region ?? this.storeProfile().region,
      direccion: store?.direccion ?? this.storeProfile().direccion,
      logo: store?.logo ?? this.storeProfile().logo,
      banner: store?.banner ?? this.storeProfile().banner,
      correo: store?.correo ?? this.storeProfile().correo,
      telefono: store?.telefono ?? this.storeProfile().telefono,
      calificacionPromedio: Number(store?.calificacionPromedio ?? this.storeProfile().calificacionPromedio ?? 0),
      redesSociales: this.storeProfile().redesSociales
    };
  }

  private resolveCategoryId(category: string | number | undefined): number {
    if (typeof category === 'number') {
      return category;
    }
    if (!category) {
      return this.categories()[0]?.id ?? 1;
    }
    const found = this.categories().find(cat => cat.nombre.toLowerCase() === String(category).toLowerCase());
    return found?.id ?? this.categories()[0]?.id ?? 1;
  }

  private normalizeProduct(product: any): SellerProduct {
    const stock = Number(product?.stock ?? 0);
    return {
      id: Number(product?.id ?? 0),
      vendorId: product?.vendorId != null ? Number(product.vendorId) : (product?.vendedorId != null ? Number(product.vendedorId) : this.storeId ?? undefined),
      nombre: product?.nombre ?? '',
      descripcion: product?.descripcion ?? '',
      sku: product?.sku ?? '',
      categoria: product?.categoriaNombre ?? product?.categoria ?? 'Sin categoría',
      precio: Number(product?.precio ?? 0),
      stock,
      peso: Number(product?.peso ?? 0),
      estado: product?.activo === false ? 'INACTIVO' : (stock <= 0 ? 'SIN_STOCK' : 'ACTIVO'),
      imagenes: Array.isArray(product?.imagenes)
        ? product.imagenes.map((img: any) => typeof img === 'string' ? img : (img?.url ?? '')).filter(Boolean)
        : []
    };
  }

  private isOwnProduct(product: SellerProduct): boolean {
    if (this.storeId == null) {
      return true;
    }
    return product.vendorId == null || product.vendorId === this.storeId;
  }

  private normalizeOrder(order: any): SellerOrder {
    return {
      id: Number(order?.id ?? 0),
      numeroPedido: order?.numeroPedido ?? '',
      fecha: order?.fechaPedido ?? order?.fecha ?? new Date().toISOString(),
      clienteNombre: order?.compradorNombre ?? order?.clienteNombre ?? order?.compradorCorreo ?? 'Cliente',
      clienteCorreo: order?.compradorCorreo ?? order?.clienteCorreo ?? '',
      items: (order?.detalles ?? order?.items ?? []).map((item: any, idx: number) => ({
        id: Number(item?.id ?? idx + 1),
        productoId: Number(item?.productoId ?? 0),
        productoNombre: item?.productoNombre ?? item?.nombre ?? '',
        sku: item?.sku ?? '',
        precio: Number(item?.precioUnitario ?? item?.precio ?? 0),
        cantidad: Number(item?.cantidad ?? 0),
        imagen: item?.imagen ?? item?.imagenes?.[0] ?? '/img/aceite-oliva.jpeg'
      })),
      subtotal: Number(order?.subtotal ?? 0),
      impuesto: Number(order?.impuesto ?? 0),
      envio: Number(order?.costoEnvio ?? order?.envio ?? 0),
      total: Number(order?.total ?? 0),
      estado: (order?.estado ?? 'PENDIENTE') as SellerOrder['estado'],
      metodoPago: order?.metodoPago ?? '',
      direccionEntrega: order?.direccionEntrega ?? ''
    };
  }

  private normalizeNotification(notif: any): SellerNotification {
    return {
      id: Number(notif?.id ?? 0),
      tipo: (notif?.tipo ?? 'SISTEMA') as SellerNotification['tipo'],
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

  private normalizeConversation(conv: any): SellerConversation {
    const buyerEmail = conv?.compradorCorreo ?? '';
    return {
      id: Number(conv?.id ?? 0),
      compradorNombre: buyerEmail ? buyerEmail.split('@')[0] : 'Comprador',
      compradorCorreo: buyerEmail,
      compradorAvatar: '/img/AdultoMayor.jpg',
      ultimoMensaje: conv?.ultimoMensaje ?? '',
      fechaUltimoMensaje: conv?.fechaUltimoMensaje ?? conv?.fechaCreacion ?? new Date().toISOString(),
      noLeidos: Number(conv?.noLeidos ?? 0),
      mensajes: []
    };
  }

  private normalizeImport(log: any): XmlImportLog {
    const total = Number(log?.totalRegistros ?? 0);
    const correctos = Number(log?.registrosCorrectos ?? 0);
    const errores = Number(log?.registrosError ?? 0);
    return {
      id: Number(log?.id ?? 0),
      fecha: log?.fechaImportacion ?? log?.fecha ?? new Date().toISOString(),
      archivoNombre: log?.nombreArchivo ?? log?.archivoNombre ?? '',
      registrosProcesados: total,
      registrosCreados: correctos,
      registrosActualizados: Math.max(0, total - correctos - errores),
      registrosFallidos: errores,
      estado: errores > 0 ? (correctos > 0 ? 'PARCIAL' : 'FALLIDO') : 'EXITOSO',
      detallesErrores: log?.detallesErrores
    };
  }

  private normalizeExport(log: any): ExportLog {
    return {
      id: Number(log?.id ?? 0),
      fecha: log?.fechaExportacion ?? log?.fecha ?? new Date().toISOString(),
      tipo: (log?.formato ?? log?.tipo ?? 'JSON') as ExportLog['tipo'],
      archivoNombre: log?.rutaArchivo?.split('/').pop() ?? log?.archivoNombre ?? '',
      registrosExportados: Number(log?.registrosExportados ?? 0),
      urlDescarga: log?.rutaArchivo ?? log?.urlDescarga ?? ''
    };
  }

  loadBackendData(): Observable<void> {
    const safeGet = <T>(request$: Observable<T>, fallback: T) =>
      request$.pipe(catchError(() => of(fallback)));

    return forkJoin({
      profile: safeGet(this.http.get<any>(`${this.baseUrl}/auth/profile`), null),
      store: safeGet(this.http.get<any>(`${this.baseUrl}/vendedores/mi-tienda`), null),
      categories: safeGet(this.http.get<any[]>(`${this.baseUrl}/categorias`), []),
      products: safeGet(this.http.get<any[]>(`${this.baseUrl}/vendedores/mi-tienda/productos`), []),
      orders: safeGet(this.http.get<any[]>(`${this.baseUrl}/pedidos/tienda`), []),
      notifications: safeGet(this.http.get<any[]>(`${this.baseUrl}/notificaciones`), []),
      conversations: safeGet(this.http.get<any[]>(`${this.baseUrl}/chat/conversaciones`), []),
      imports: safeGet(this.http.get<any[]>(`${this.baseUrl}/importar`), []),
      exports: safeGet(this.http.get<any[]>(`${this.baseUrl}/exportar`), [])
      ,payments: safeGet(this.http.get<any[]>(`${this.baseUrl}/pagos/mi-historial`), [])
    }).pipe(
      tap(({ profile, store, categories, products, orders, notifications, conversations, imports, exports, payments }) => {
        this.settings.update(current => ({
          ...current,
          cuenta: {
            nombrePersonal: this.buildDisplayNameFromProfile(profile),
            correo: profile?.correo ?? current.cuenta.correo ?? this.authService.currentUserEmail() ?? '',
            telefono: profile?.telefono ?? current.cuenta.telefono ?? '',
            cargo: this.authService.currentUserRoles().includes('VENDEDOR') ? 'Propietario Tienda' : current.cuenta.cargo
          }
        }));

        if (store) {
          this.storeProfile.set(this.normalizeStoreProfile(store));
        }

        this.categories.set(categories.map(cat => ({ id: Number(cat?.id ?? 0), nombre: cat?.nombre ?? '' })));

        const ownProducts = products
          .map(p => this.normalizeProduct(p))
          .filter(p => this.isOwnProduct(p));
        this.products.set(ownProducts);

        this.inventoryMovements.set([]);
        this.orders.set(orders.map(o => this.normalizeOrder(o)));
        this.notifications.set(notifications.map(n => this.normalizeNotification(n)));
        this.conversations.set(conversations.map(c => this.normalizeConversation(c)));
        this.xmlImports.set(imports.map(i => this.normalizeImport(i)));
        this.exports.set(exports.map(e => this.normalizeExport(e)));
        this.payments.set((payments ?? []).map(p => ({
          id: Number(p?.id ?? 0),
          monto: Number(p?.monto ?? 0),
          metodoPago: p?.metodoPago ?? '',
          estadoPago: p?.estadoPago ?? '',
          fechaPago: p?.fechaPago ?? new Date().toISOString(),
          codigoOperacion: p?.codigoOperacion ?? '',
          pedidoId: Number(p?.pedidoId ?? 0),
          numeroPedido: p?.numeroPedido ?? ''
        })));
        this.rebuildCustomersFromOrders();
        this.backendLoaded.set(true);
      }),
      map(() => void 0)
    );
  }

  // --- METHODS (ACTIONS & SIMULATIONS) ---

  // Tienda
  updateStoreProfile(updated: StoreProfile): Observable<StoreProfile> {
    const vendorId = this.storeId;
    if (!vendorId) {
      return throwError(() => new Error('No se pudo determinar la tienda del vendedor'));
    }

    const payload = {
      nombreTienda: updated.nombre,
      descripcion: updated.descripcion,
      region: updated.region,
      direccion: updated.direccion,
      logo: updated.logo,
      banner: updated.banner
    };

    return this.http.put<any>(`${this.baseUrl}/vendedores/${vendorId}`, payload).pipe(
      map(result => this.normalizeStoreProfile({
        ...result,
        correo: updated.correo,
        telefono: updated.telefono
      })),
      tap(profile => this.storeProfile.set(profile))
    );
  }

  // Productos CRUD
  createProduct(request: Omit<SellerProduct, 'id'>): Observable<SellerProduct> {
    const payload = {
      nombre: request.nombre,
      descripcion: request.descripcion,
      sku: request.sku,
      precio: request.precio,
      stock: request.stock,
      peso: request.peso,
      categoriaId: this.resolveCategoryId((request as any).categoria),
      imagenes: request.imagenes
    };

    return this.http.post<any>(`${this.baseUrl}/productos`, payload).pipe(
      map(product => this.normalizeProduct(product)),
      tap(prod => {
        this.products.update(list => [prod, ...list]);
      })
    );
  }

  updateProduct(id: number, request: Partial<SellerProduct>): Observable<SellerProduct> {
    const original = this.products().find(p => p.id === id);
    if (!original) return throwError(() => new Error('Producto no encontrado'));
    if (!this.isOwnProduct(original)) {
      return throwError(() => new Error('No estás autorizado para modificar este producto'));
    }

    const payload = {
      nombre: request.nombre ?? original.nombre,
      descripcion: request.descripcion ?? original.descripcion,
      sku: request.sku ?? original.sku,
      precio: request.precio ?? original.precio,
      stock: request.stock ?? original.stock,
      peso: request.peso ?? original.peso,
      categoriaId: this.resolveCategoryId((request as any).categoria ?? original.categoria),
      imagenes: request.imagenes ?? original.imagenes
    };

    return this.http.put<any>(`${this.baseUrl}/productos/${id}`, payload).pipe(
      map(product => this.normalizeProduct(product)),
      tap(prod => {
        this.products.update(list => list.map(p => p.id === id ? prod : p));
      })
    );
  }

  deleteProduct(id: number): Observable<void> {
    const original = this.products().find(p => p.id === id);
    if (original && !this.isOwnProduct(original)) {
      return throwError(() => new Error('No estás autorizado para eliminar este producto'));
    }

    return this.http.delete<void>(`${this.baseUrl}/productos/${id}`).pipe(
      tap(() => {
        this.products.update(list => list.filter(p => p.id !== id));
      })
    );
  }

  // Inventario Ajustes
  adjustInventory(productoId: number, cantidad: number, tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE', observacion: string): Observable<SellerProduct> {
    const prod = this.products().find(p => p.id === productoId);
    if (!prod) return throwError(() => new Error('Producto no encontrado'));
    if (!this.isOwnProduct(prod)) {
      return throwError(() => new Error('No estás autorizado para manipular este producto.'));
    }

    return this.http.post<any>(`${this.baseUrl}/inventarios/productos/${productoId}/movimientos`, {
      tipoMovimiento: tipo,
      cantidad,
      observacion
    }).pipe(
      switchMap(() => this.http.get<any>(`${this.baseUrl}/inventarios/productos/${productoId}`)),
      tap(inv => {
        this.products.update(list => list.map(p => p.id === productoId ? {
          ...p,
          stock: Number(inv?.stockActual ?? p.stock),
          estado: Number(inv?.stockActual ?? p.stock) <= 0 ? 'SIN_STOCK' : p.estado
        } : p));
        this.inventoryMovements.update(list => [{
          id: Math.max(...list.map(m => m.id), 500) + 1,
          fecha: new Date().toISOString(),
          productoId,
          productoNombre: prod.nombre,
          sku: prod.sku,
          cantidad,
          tipo,
          observacion
        }, ...list]);
      }),
      map(() => this.products().find(p => p.id === productoId) ?? prod)
    );
  }

  private logMovement(productoId: number, nombre: string, sku: string, cantidad: number, tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE', observacion: string) {
    const newMvt: InventoryMovement = {
      id: Math.max(...this.inventoryMovements().map(m => m.id), 500) + 1,
      fecha: new Date().toISOString(),
      productoId,
      productoNombre: nombre,
      sku,
      cantidad,
      tipo,
      observacion
    };
    this.inventoryMovements.update(list => [newMvt, ...list]);
  }

  // Pedidos Estado
  updateOrderStatus(orderId: number, estado: 'PENDIENTE' | 'PROCESANDO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO'): Observable<SellerOrder> {
    const original = this.orders().find(o => o.id === orderId);
    if (!original) return throwError(() => new Error('Pedido no encontrado'));

    const request = estado === 'CANCELADO'
      ? this.http.put<any>(`${this.baseUrl}/pedidos/${orderId}/cancelar`, null)
      : this.http.put<any>(`${this.baseUrl}/pedidos/${orderId}/estado`, { estado });

    return request.pipe(
      map(order => this.normalizeOrder(order)),
      tap(ord => {
        this.orders.update(list => list.map(o => o.id === orderId ? ord : o));
        this.addNotification(
          'PEDIDO',
          `Pedido ${ord.numeroPedido} actualizado`,
          `El estado del pedido ${ord.numeroPedido} a nombre de ${ord.clienteNombre} ha sido cambiado a "${estado}".`
        );
      })
    );
  }

  loadMessageHistory(conversationId: number): Observable<SellerMessage[]> {
    return this.http.get<any[]>(`${this.baseUrl}/chat/conversaciones/${conversationId}/mensajes`).pipe(
      map(msgs => msgs.map(m => ({
        id: Number(m?.id ?? 0),
        remitente: m?.remitenteCorreo === this.authService.currentUserEmail() ? 'VENDEDOR' as const : 'COMPRADOR' as const,
        contenido: m?.contenido ?? '',
        fecha: m?.fechaEnvio ?? new Date().toISOString(),
        leido: Boolean(m?.leido)
      }))),
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

    const isSeller = data.remitenteCorreo === this.authService.currentUserEmail();
    const msg: SellerMessage = {
      id: Number(data.id ?? 0),
      remitente: isSeller ? 'VENDEDOR' : 'COMPRADOR',
      contenido: data.contenido ?? '',
      fecha: data.fechaEnvio ?? new Date().toISOString(),
      leido: Boolean(data.leido)
    };

    this.conversations.update(list => {
      const exists = list.some(c => c.id === conversacionId);
      if (!exists) {
        // Reload conversations to pull the new thread
        this.loadBackendData().subscribe();
        return list;
      }
      return list.map(c => {
        if (c.id === conversacionId) {
          // Avoid duplicates
          if (c.mensajes.some(m => m.id === msg.id)) {
            return c;
          }

          // Trigger a notification for new customer messages
          return {
            ...c,
            ultimoMensaje: msg.contenido,
            fechaUltimoMensaje: msg.fecha,
            noLeidos: isSeller ? c.noLeidos : c.noLeidos + 1,
            mensajes: [...c.mensajes, msg]
          };
        }
        return c;
      });
    });
  }

  // Enviar mensaje en Chat
  sendChatMessage(conversationId: number, contenido: string): Observable<SellerMessage> {
    const conv = this.conversations().find(c => c.id === conversationId);
    if (!conv) return throwError(() => new Error('Conversación no encontrada'));

    // Try sending via WebSocket first
    const sentViaSocket = this.chatService.sendMessageViaSocket(
      conversationId,
      this.authService.currentUserEmail()!,
      contenido
    );

    if (sentViaSocket) {
      const tempMsg: SellerMessage = {
        id: Math.floor(Math.random() * -100000),
        remitente: 'VENDEDOR' as const,
        contenido,
        fecha: new Date().toISOString(),
        leido: true
      };
      return of(tempMsg);
    }

    // Fallback to HTTP POST if WebSocket connection is not open
    return this.http.post<any>(`${this.baseUrl}/chat/conversaciones/${conversationId}/mensajes`, { contenido }).pipe(
      map(msg => ({
        id: Number(msg?.id ?? Math.floor(Math.random() * 100000)),
        remitente: 'VENDEDOR' as const,
        contenido: msg?.contenido ?? contenido,
        fecha: msg?.fechaEnvio ?? new Date().toISOString(),
        leido: Boolean(msg?.leido ?? true)
      })),
      tap(msg => {
        this.conversations.update(list => list.map(c => {
          if (c.id === conversationId) {
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
  }

  // Notificaciones marcar leídas
  markNotificationAsRead(id: number): void {
    this.http.put<void>(`${this.baseUrl}/notificaciones/${id}/leer`, null).subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => n.id === id ? { ...n, leido: true } : n));
        this.refreshNotificationsFromBackend();
      }
    });
  }

  markAllNotificationsAsRead(): void {
    this.notifications().filter(n => !n.leido).forEach(n => this.markNotificationAsRead(n.id));
  }

  addNotification(tipo: 'PEDIDO' | 'PAGO' | 'CHAT' | 'SISTEMA', titulo: string, contenido: string) {
    const newNotif: SellerNotification = {
      id: Math.floor(Math.random() * 100000),
      tipo,
      titulo,
      contenido,
      fecha: new Date().toISOString(),
      leido: false
    };
    this.notifications.update(list => [newNotif, ...list]);
  }

  // Importar XML
  importCatalogXmlFile(file: File): Observable<XmlImportLog> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<any>(`${this.baseUrl}/importar`, formData).pipe(
      map(result => this.normalizeImport({
        id: result?.id,
        nombreArchivo: file.name,
        fechaImportacion: result?.fechaImportacion,
        totalRegistros: result?.totalRegistros ?? result?.registrosProcesados ?? 0,
        registrosCorrectos: result?.registrosCorrectos ?? result?.registrosCreados ?? 0,
        registrosError: result?.registrosError ?? result?.registrosFallidos ?? 0
      })),
      tap(log => {
        this.xmlImports.update(list => [log, ...list]);
        this.loadBackendData().subscribe();
        this.addNotification(
          'SISTEMA',
          `Importación XML finalizada`,
          `El archivo ${log.archivoNombre} fue procesado. Estado: ${log.estado}. Creados: ${log.registrosCreados}.`
        );
      })
    );
  }

  // Exportar Catálogo
  exportCatalogData(format: 'JSON' | 'XML'): Observable<ExportLog> {
    return this.http.post<any>(`${this.baseUrl}/exportar`, null, {
      params: new HttpParams().set('formato', format)
    }).pipe(
      map(result => this.normalizeExport({
        id: result?.id,
        formato: result?.formato ?? format,
        fechaExportacion: result?.fechaExportacion,
        rutaArchivo: result?.rutaArchivo ?? result?.urlDescarga,
        registrosExportados: result?.registrosExportados ?? this.products().length
      })),
      tap(log => {
        this.exports.update(list => [log, ...list]);
        this.addNotification(
          'SISTEMA',
          `Exportación generada exitosamente`,
          `Se ha completado la exportación del catálogo en formato ${log.tipo}.`
        );
      })
    );
  }

  // Guardar Configuraciones
  saveSettings(updated: SellerSettings): Observable<SellerSettings> {
    return this.http.put<any>(`${this.baseUrl}/auth/profile`, {
      nombrePersonal: updated.cuenta.nombrePersonal,
      telefono: updated.cuenta.telefono,
      direccion: this.storeProfile().direccion,
      fotoPerfil: this.storeProfile().logo
    }).pipe(
      map(profile => ({
        ...updated,
        cuenta: {
          nombrePersonal: profile?.nombres && profile?.apellidos
            ? `${profile.nombres} ${profile.apellidos}`.trim()
            : updated.cuenta.nombrePersonal,
          correo: profile?.correo ?? updated.cuenta.correo,
          telefono: profile?.telefono ?? updated.cuenta.telefono,
          cargo: updated.cuenta.cargo
        }
      })),
      tap(settings => this.settings.set(settings))
    );
  }

  private buildDisplayNameFromSession(): string {
    const email = this.authService.currentUserEmail() ?? '';
    return this.emailToDisplayName(email);
  }

  private buildDisplayNameFromProfile(profile: any): string {
    const nombres = String(profile?.nombres ?? '').trim();
    const apellidos = String(profile?.apellidos ?? '').trim();
    const fullName = [nombres, apellidos].filter(Boolean).join(' ').trim();
    if (fullName) {
      return fullName;
    }
    return this.emailToDisplayName(profile?.correo ?? this.authService.currentUserEmail() ?? '');
  }

  private emailToDisplayName(email: string): string {
    if (!email) {
      return 'Vendedor';
    }
    const localPart = email.split('@')[0] ?? '';
    return localPart
      .replace(/[._-]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(token => token.charAt(0).toUpperCase() + token.slice(1))
      .join(' ');
  }

  private sumOrdersForDate(date: Date): number {
    const target = date.toDateString();
    return this.orders()
      .filter(order => {
        const orderDate = new Date(order.fecha);
        return orderDate.toDateString() === target;
      })
      .reduce((acc, order) => acc + Number(order.total ?? 0), 0);
  }

  private sumOrdersForMonth(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth();
    return this.orders()
      .filter(order => {
        const orderDate = new Date(order.fecha);
        return orderDate.getFullYear() === year && orderDate.getMonth() === month;
      })
      .reduce((acc, order) => acc + Number(order.total ?? 0), 0);
  }

  private countUniqueCustomersForMonth(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth();
    const customers = new Set(
      this.orders()
        .filter(order => {
          const orderDate = new Date(order.fecha);
          return orderDate.getFullYear() === year && orderDate.getMonth() === month;
        })
        .map(order => order.clienteCorreo)
        .filter(Boolean)
    );
    return customers.size;
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private addMonths(date: Date, months: number): Date {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  private buildTrendLabel(current: number, previous: number, suffix: string): string {
    if (previous <= 0) {
      return current > 0 ? `Nuevo ${suffix}` : `Sin referencia ${suffix}`;
    }
    const percent = ((current - previous) / previous) * 100;
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}% ${suffix}`;
  }

  private rebuildCustomersFromOrders(): void {
    const map = new Map<string, SellerCustomer>();

    for (const order of this.orders()) {
      const email = order.clienteCorreo?.trim();
      if (!email) continue;

      const current = map.get(email) ?? {
        id: Math.abs(this.hashCode(email)),
        nombre: order.clienteNombre || email.split('@')[0] || 'Cliente',
        correo: email,
        telefono: '',
        comprasTotales: 0,
        ultimaCompraFecha: order.fecha,
        montoAcumulado: 0,
        ciudad: 'No registrada'
      };

      current.comprasTotales += 1;
      current.montoAcumulado += Number(order.total ?? 0);

      const currentDate = new Date(current.ultimaCompraFecha);
      const nextDate = new Date(order.fecha);
      if (Number.isNaN(currentDate.getTime()) || nextDate > currentDate) {
        current.ultimaCompraFecha = order.fecha;
      }

      map.set(email, current);
    }

    this.customers.set(Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)));
  }

  private hashCode(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash) + value.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}
