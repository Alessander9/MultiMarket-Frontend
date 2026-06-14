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

  constructor() {
    this.chatService.messageReceived$.subscribe(payload => {
      this.handleIncomingSocketMessage(payload);
    });
  }

  // --- REACTIVE STATE VIA SIGNALS ---

  // 1. Tienda Profile
  readonly storeProfile = signal<StoreProfile>({
    nombre: 'Ferretería Cleo',
    descripcion: 'Líderes en distribución de herramientas manuales, eléctricas, materiales de construcción, cerrajería, iluminación y acabados para el hogar. Más de 15 años brindando soluciones confiables a maestros de obra, talleres industriales, artesanos y familias de Lima Norte.',
    region: 'Lima',
    direccion: 'Av. Alfredo Mendiola 3540, Los Olivos, Lima',
    logo: '/img/frutosSecos.jpg',
    banner: '/img/frutos-secos-bg.jpeg',
    correo: 'contacto@ferreteriacleo.pe',
    telefono: '+51 999 888 777',
    redesSociales: {
      facebook: 'https://facebook.com/ferreteriacleooficial',
      instagram: 'https://instagram.com/ferreteriacleo',
      website: 'https://www.ferreteriacleo.pe'
    }
  });

  // 2. Productos
  readonly products = signal<SellerProduct[]>([]);

  // 3. Movimientos de Inventario
  readonly inventoryMovements = signal<InventoryMovement[]>([]);

  // 4. Pedidos
  readonly orders = signal<SellerOrder[]>([
    {
      id: 2001,
      numeroPedido: 'PED-7768',
      fecha: '2026-05-31T20:15:00-05:00',
      clienteNombre: 'Carlos Mendoza',
      clienteCorreo: 'carlos.mendoza@gmail.com',
      items: [
        { id: 3001, productoId: 101, productoNombre: 'Taladro Percutor DeWalt 20V Max', sku: 'FER-TAL-DEW-20V', precio: 489.00, cantidad: 1, imagen: '/img/aceite-coco.jpeg' },
        { id: 3002, productoId: 102, productoNombre: 'Juego de Herramientas Stanley (110 piezas)', sku: 'FER-JUE-STA-110P', precio: 299.90, cantidad: 1, imagen: '/img/aceite-oliva.jpeg' }
      ],
      subtotal: 788.90,
      envio: 15.00,
      total: 803.90,
      estado: 'PENDIENTE',
      metodoPago: 'YAPE',
      direccionEntrega: 'Av. Larco 452, Dpto 502, Miraflores, Lima'
    },
    {
      id: 2002,
      numeroPedido: 'PED-7765',
      fecha: '2026-05-31T15:30:00-05:00',
      clienteNombre: 'Andrea Rojas',
      clienteCorreo: 'andrea.rojas@outlook.com',
      items: [
        { id: 3003, productoId: 108, productoNombre: 'Candado de Acero Blindado Forte 60mm', sku: 'FER-CAN-FOR-60', precio: 59.90, cantidad: 4, imagen: '/img/miel.jpg' }
      ],
      subtotal: 239.60,
      envio: 10.00,
      total: 249.60,
      estado: 'PROCESANDO',
      metodoPago: 'VISA',
      direccionEntrega: 'Calle Los Pinos 142, San Isidro, Lima'
    },
    {
      id: 2003,
      numeroPedido: 'PED-7762',
      fecha: '2026-05-30T11:00:00-05:00',
      clienteNombre: 'Juan Carlos Guerrero',
      clienteCorreo: 'jc.guerrero@hotmail.com',
      items: [
        { id: 3004, productoId: 105, productoNombre: 'Cerradura Digital Inteligente Yale YDF40', sku: 'FER-CER-YAL-DIG', precio: 389.00, cantidad: 1, imagen: '/img/propoleo.jpg' }
      ],
      subtotal: 389.00,
      envio: 25.00,
      total: 414.00,
      estado: 'ENVIADO',
      metodoPago: 'PLIN',
      direccionEntrega: 'Av. El Sol 821, Wanchaq, Cusco'
    },
    {
      id: 2004,
      numeroPedido: 'PED-7750',
      fecha: '2026-05-28T09:45:00-05:00',
      clienteNombre: 'Maria Alejandra Torres',
      clienteCorreo: 'm.torres@gmail.com',
      items: [
        { id: 3005, productoId: 107, productoNombre: 'Pintura Látex CPP Pato Premium - Blanco (4 Galones)', sku: 'FER-PIN-PAT-BL4', precio: 189.00, cantidad: 2, imagen: '/img/super-alimentos-bg.jpeg' },
        { id: 3006, productoId: 111, productoNombre: 'Wincha Métrica Stanley Powerlock 8m/26ft', sku: 'FER-WIN-STA-8M', precio: 42.00, cantidad: 1, imagen: '/img/frutosSecos.jpg' }
      ],
      subtotal: 420.00,
      envio: 15.00,
      total: 435.00,
      estado: 'ENTREGADO',
      metodoPago: 'MASTERCARD',
      direccionEntrega: 'Urb. Santa Victoria G-15, Chiclayo, Lambayeque'
    },
    {
      id: 2005,
      numeroPedido: 'PED-7744',
      fecha: '2026-05-27T14:20:00-05:00',
      clienteNombre: 'Pedro Alvarez',
      clienteCorreo: 'palvarez@cibertec.edu.pe',
      items: [
        { id: 3007, productoId: 101, productoNombre: 'Taladro Percutor DeWalt 20V Max', sku: 'FER-TAL-DEW-20V', precio: 489.00, cantidad: 1, imagen: '/img/aceite-coco.jpeg' }
      ],
      subtotal: 489.00,
      envio: 15.00,
      total: 504.00,
      estado: 'CANCELADO',
      metodoPago: 'TRANSFERENCIA',
      direccionEntrega: 'Jr. Huallaga 321, Tarapoto, San Martín'
    }
  ]);

  // 5. Clientes
  readonly customers = signal<SellerCustomer[]>([
    { id: 801, nombre: 'Carlos Mendoza', correo: 'carlos.mendoza@gmail.com', telefono: '+51 912 345 678', comprasTotales: 3, ultimaCompraFecha: '2026-05-31', montoAcumulado: 412.50, ciudad: 'Lima' },
    { id: 802, nombre: 'Andrea Rojas', correo: 'andrea.rojas@outlook.com', telefono: '+51 922 456 789', comprasTotales: 5, ultimaCompraFecha: '2026-05-31', montoAcumulado: 380.00, ciudad: 'Lima' },
    { id: 803, nombre: 'Juan Carlos Guerrero', correo: 'jc.guerrero@hotmail.com', telefono: '+51 933 567 890', comprasTotales: 2, ultimaCompraFecha: '2026-05-30', montoAcumulado: 219.00, ciudad: 'Cusco' },
    { id: 804, nombre: 'Maria Alejandra Torres', correo: 'm.torres@gmail.com', telefono: '+51 944 678 901', comprasTotales: 4, ultimaCompraFecha: '2026-05-28', montoAcumulado: 580.90, ciudad: 'Chiclayo' },
    { id: 805, nombre: 'Pedro Alvarez', correo: 'palvarez@cibertec.edu.pe', telefono: '+51 955 789 012', comprasTotales: 1, ultimaCompraFecha: '2026-05-27', montoAcumulado: 74.90, ciudad: 'Tarapoto' },
    { id: 806, nombre: 'Sofia Castro', correo: 'sofia.castro@gmail.com', telefono: '+51 966 890 123', comprasTotales: 8, ultimaCompraFecha: '2026-05-20', montoAcumulado: 1250.00, ciudad: 'Arequipa' }
  ]);

  // 6. Chat & Mensajes
  readonly conversations = signal<SellerConversation[]>([
    {
      id: 401,
      compradorNombre: 'Carlos Mendoza',
      compradorCorreo: 'carlos.mendoza@gmail.com',
      compradorAvatar: '/img/AdultoMayor.jpg',
      ultimoMensaje: 'Hola, acabo de realizar mi pedido. ¿Cuándo se despacha?',
      fechaUltimoMensaje: '2026-05-31T20:45:00-05:00',
      noLeidos: 1,
      mensajes: [
        { id: 1, remitente: 'COMPRADOR', contenido: 'Buenas tardes. Quisiera consultar sobre el Café Blend Premium en grano.', fecha: '2026-05-31T14:10:00-05:00', leido: true },
        { id: 2, remitente: 'VENDEDOR', contenido: '¡Hola Carlos! Un gusto saludarte. El Café Blend Premium está tostado hace solo 3 días, tiene un perfil excelente. ¿Deseas molido o en grano entero?', fecha: '2026-05-31T14:15:00-05:00', leido: true },
        { id: 3, remitente: 'COMPRADOR', contenido: 'Excelente. Lo prefiero en grano. Haré la compra ahora mismo.', fecha: '2026-05-31T14:20:00-05:00', leido: true },
        { id: 4, remitente: 'COMPRADOR', contenido: 'Hola, acabo de realizar mi pedido. ¿Cuándo se despacha?', fecha: '2026-05-31T20:45:00-05:00', leido: false }
      ]
    },
    {
      id: 402,
      compradorNombre: 'Andrea Rojas',
      compradorCorreo: 'andrea.rojas@outlook.com',
      compradorAvatar: '/img/AdultoMayor.jpg',
      ultimoMensaje: 'Muchas gracias por la atención brindada.',
      fechaUltimoMensaje: '2026-05-31T16:15:00-05:00',
      noLeidos: 0,
      mensajes: [
        { id: 5, remitente: 'COMPRADOR', contenido: 'Hola, ¿tienen stock del chocolate para taza tradicional?', fecha: '2026-05-31T15:10:00-05:00', leido: true },
        { id: 6, remitente: 'VENDEDOR', contenido: 'Hola Andrea. Sí tenemos stock disponible, en tabletas puras de cacao chuncho de Cusco. Puedes ordenar con total tranquilidad.', fecha: '2026-05-31T15:12:00-05:00', leido: true },
        { id: 7, remitente: 'COMPRADOR', contenido: 'Perfecto, acabo de hacer el pago por Visa de 4 tabletas.', fecha: '2026-05-31T15:32:00-05:00', leido: true },
        { id: 8, remitente: 'VENDEDOR', contenido: 'Confirmado. Tu pedido PED-7765 está en preparación y saldrá mañana temprano en el primer turno de reparto.', fecha: '2026-05-31T16:00:00-05:00', leido: true },
        { id: 9, remitente: 'COMPRADOR', contenido: 'Muchas gracias por la atención brindada.', fecha: '2026-05-31T16:15:00-05:00', leido: true }
      ]
    },
    {
      id: 403,
      compradorNombre: 'Juan Carlos Guerrero',
      compradorCorreo: 'jc.guerrero@hotmail.com',
      compradorAvatar: '/img/AdultoMayor.jpg',
      ultimoMensaje: 'El café llegó perfecto. Un sabor increíble.',
      fechaUltimoMensaje: '2026-05-30T18:30:00-05:00',
      noLeidos: 0,
      mensajes: [
        { id: 10, remitente: 'COMPRADOR', contenido: 'Hola, hacen envíos a Cusco ciudad?', fecha: '2026-05-29T10:00:00-05:00', leido: true },
        { id: 11, remitente: 'VENDEDOR', contenido: 'Sí Juan Carlos, enviamos a nivel nacional vía Olva Courier. A Cusco toma aproximadamente de 24 a 48 horas.', fecha: '2026-05-29T10:05:00-05:00', leido: true },
        { id: 12, remitente: 'COMPRADOR', contenido: 'Comprado. Pedido PED-7762.', fecha: '2026-05-30T11:05:00-05:00', leido: true },
        { id: 13, remitente: 'VENDEDOR', contenido: 'Perfecto. Ya se encuentra en tránsito con el número de seguimiento OLV-8832941.', fecha: '2026-05-30T12:00:00-05:00', leido: true },
        { id: 14, remitente: 'COMPRADOR', contenido: 'El café llegó perfecto. Un sabor increíble.', fecha: '2026-05-30T18:30:00-05:00', leido: true }
      ]
    }
  ]);

  // 7. Importaciones XML
  readonly xmlImports = signal<XmlImportLog[]>([
    { id: 701, fecha: '2026-05-31T11:00:00-05:00', archivoNombre: 'catalogo_cafe_mayo2026.xml', registrosProcesados: 12, registrosCreados: 8, registrosActualizados: 4, registrosFallidos: 0, estado: 'EXITOSO' },
    { id: 702, fecha: '2026-05-28T16:30:00-05:00', archivoNombre: 'catalogo_chocolates_err.xml', registrosProcesados: 5, registrosCreados: 2, registrosActualizados: 1, registrosFallidos: 2, estado: 'PARCIAL', detallesErrores: ['Línea 24: SKU CHO-TAZ-TRA-200G duplicado en sistema.', 'Línea 38: Categoría "Confitería" no existe en la tienda.'] },
    { id: 703, fecha: '2026-05-20T09:15:00-05:00', archivoNombre: 'artesanias_malformado.xml', registrosProcesados: 0, registrosCreados: 0, registrosActualizados: 0, registrosFallidos: 0, estado: 'FALLIDO', detallesErrores: ['Error XML Parsing: Etiqueta de cierre </producto> ausente o inválida en la línea 12.'] }
  ]);

  // 8. Exportaciones
  readonly exports = signal<ExportLog[]>([
    { id: 601, fecha: '2026-05-31T22:00:00-05:00', tipo: 'JSON', archivoNombre: 'export_catalogo_cafe_altomayo_20260531.json', registrosExportados: 6, urlDescarga: '/exports/export_catalogo_cafe_altomayo_20260531.json' },
    { id: 602, fecha: '2026-05-25T14:00:00-05:00', tipo: 'XML', archivoNombre: 'export_catalogo_cafe_altomayo_20260525.xml', registrosExportados: 6, urlDescarga: '/exports/export_catalogo_cafe_altomayo_20260525.xml' }
  ]);

  // 9. Pagos & Liquidaciones
  readonly payouts = signal<SellerPayout[]>([
    { id: 901, codigoOperacion: 'LIQ-0029412', fecha: '2026-05-28', monto: 2450.00, metodo: 'Transferencia BCP', estado: 'LIQUIDADO', cuentaDestino: 'CTA-BCP-***4829' },
    { id: 902, codigoOperacion: 'LIQ-0028391', fecha: '2026-05-15', monto: 3820.50, metodo: 'Transferencia BCP', estado: 'LIQUIDADO', cuentaDestino: 'CTA-BCP-***4829' },
    { id: 903, codigoOperacion: 'LIQ-0027129', fecha: '2026-04-30', monto: 1980.00, metodo: 'Transferencia Interbank', estado: 'LIQUIDADO', cuentaDestino: 'CTA-INT-***9921' },
    { id: 904, codigoOperacion: 'LIQ-0030101', fecha: '2026-05-31', monto: 1250.00, metodo: 'Transferencia BCP', estado: 'PROCESANDO', cuentaDestino: 'CTA-BCP-***4829' }
  ]);

  // 10. Notificaciones
  readonly notifications = signal<SellerNotification[]>([
    { id: 1, tipo: 'PEDIDO', titulo: 'Nuevo Pedido Recibido', contenido: 'El comprador Carlos Mendoza ha realizado el pedido PED-7768 por un monto de S/ 169.30.', fecha: '2026-05-31T20:15:00-05:00', leido: false },
    { id: 2, tipo: 'CHAT', titulo: 'Mensaje sin leer', contenido: 'Carlos Mendoza envió un mensaje: "Hola, acabo de realizar mi pedido. ¿Cuándo se despacha?"', fecha: '2026-05-31T20:45:00-05:00', leido: false },
    { id: 3, tipo: 'PAGO', titulo: 'Liquidación en Proceso', contenido: 'Se ha iniciado la liquidación quincenal LIQ-0030101 por S/ 1,250.00 a tu cuenta registrada.', fecha: '2026-05-31T00:05:00-05:00', leido: true },
    { id: 4, tipo: 'SISTEMA', titulo: 'Stock Crítico de Producto', contenido: 'Alerta: El stock de "Café Espresso Roast - Grano 500g" ha bajado a 8 unidades (Mínimo recomendado: 10).', fecha: '2026-05-30T18:00:00-05:00', leido: false },
    { id: 5, tipo: 'PEDIDO', titulo: 'Pedido Entregado con Éxito', contenido: 'El pedido PED-7750 a nombre de Maria Alejandra Torres ha sido entregado en Chiclayo.', fecha: '2026-05-28T16:45:00-05:00', leido: true }
  ]);

  // 11. Configuraciones
  readonly settings = signal<SellerSettings>({
    cuenta: {
      nombrePersonal: 'Alessander Guerrero',
      correo: 'vendedor@cafealtomayo.pe',
      telefono: '+51 988 777 666',
      cargo: 'Gerente General y Propietario'
    },
    seguridad: {
      dobleFactor: false,
      ultimaSesion: '2026-05-31T18:30:24-05:00 (Tarapoto, Perú)'
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

  readonly salesToday = computed(() => 2540);
  readonly salesMonth = computed(() => 32500);
  readonly activeProductsCount = computed(() => this.products().filter(p => p.estado === 'ACTIVO').length);
  readonly newCustomersCount = computed(() => 25);
  readonly storeRating = computed(() => 4.8);
  readonly categories = signal<{ id: number; nombre: string }[]>([]);

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
      store: safeGet(this.http.get<any>(`${this.baseUrl}/vendedores/mi-tienda`), null),
      categories: safeGet(this.http.get<any[]>(`${this.baseUrl}/categorias`), []),
      products: safeGet(this.http.get<any[]>(`${this.baseUrl}/vendedores/mi-tienda/productos`), []),
      orders: safeGet(this.http.get<any[]>(`${this.baseUrl}/pedidos/tienda`), []),
      notifications: safeGet(this.http.get<any[]>(`${this.baseUrl}/notificaciones`), []),
      conversations: safeGet(this.http.get<any[]>(`${this.baseUrl}/chat/conversaciones`), [])
    }).pipe(
      tap(({ store, categories, products, orders, notifications, conversations }) => {
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
          if (!isSeller) {
            this.addNotification(
              'CHAT',
              `Nuevo mensaje de ${c.compradorNombre}`,
              msg.contenido
            );
          }

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
    return of(updated).pipe(
      tap(settings => this.settings.set(settings))
    );
  }
}
