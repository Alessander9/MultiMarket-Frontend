import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { tap, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

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
  private readonly baseUrl = environment.apiUrl;
  private storeId: number | null = null;

  // --- REACTIVE STATE VIA SIGNALS ---

  // 1. Tienda Profile
  readonly storeProfile = signal<StoreProfile>({
    nombre: 'Ferretería Cleo',
    descripcion: 'Líderes en distribución de herramientas manuales, eléctricas, materiales de construcción, cerrajería, iluminación y acabados para el hogar. Más de 15 años brindando soluciones confiables a maestros de obra, talleres industriales, artesanos y familias de Lima Norte.',
    region: 'Lima',
    direccion: 'Av. Alfredo Mendiola 3540, Los Olivos, Lima',
    logo: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1513828722001-c22dbf88279e?w=1200&auto=format&fit=crop&q=80',
    correo: 'contacto@ferreteriacleo.pe',
    telefono: '+51 999 888 777',
    redesSociales: {
      facebook: 'https://facebook.com/ferreteriacleooficial',
      instagram: 'https://instagram.com/ferreteriacleo',
      website: 'https://www.ferreteriacleo.pe'
    }
  });

  // 2. Productos
  readonly products = signal<SellerProduct[]>([
    { id: 101, nombre: 'Taladro Percutor DeWalt 20V Max', descripcion: 'Taladro percutor inalámbrico Brushless (sin carbones) de alta potencia. Incluye 2 baterías de litio de 2.0Ah, cargador rápido y maletín de transporte.', sku: 'FER-TAL-DEW-20V', categoria: 'Herramientas Eléctricas', precio: 489.00, stock: 25, peso: 2.4, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80'] },
    { id: 102, nombre: 'Juego de Herramientas Stanley (110 piezas)', descripcion: 'Completo maletín de herramientas mecánicas de acero cromo vanadio. Incluye dados de 1/2 y 1/4, llaves de trinquete, destornilladores, alicates y llaves hexagonales.', sku: 'FER-JUE-STA-110P', categoria: 'Herramientas Manuales', precio: 299.90, stock: 15, peso: 6.5, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80'] },
    { id: 103, nombre: 'Amoladora Angular Bosch 4 1/2" 850W', descripcion: 'Amoladora angular profesional Bosch GWS 850. Cuenta con motor potente de 850W, guarda de protección y empuñadura auxiliar ergonómica.', sku: 'FER-AMO-BOS-4.5', categoria: 'Herramientas Eléctricas', precio: 249.00, stock: 18, peso: 1.9, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80'] },
    { id: 104, nombre: 'Caja de Herramientas Tramontina Plástica 20"', descripcion: 'Caja portaherramientas plástica de alta resistencia con cierres metálicos y bandeja interna removible. Ideal para organizar y transportar equipo.', sku: 'FER-CAJ-TRA-20', categoria: 'Herramientas Manuales', precio: 69.90, stock: 40, peso: 2.0, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80'] },
    { id: 105, nombre: 'Cerradura Digital Inteligente Yale YDF40', descripcion: 'Cerradura biométrica digital de sobreponer para puertas de madera o metal. Métodos de acceso: Huella dactilar, clave numérica y tarjeta RFID.', sku: 'FER-CER-YAL-DIG', categoria: 'Cerrajería & Seguridad', precio: 389.00, stock: 12, peso: 1.5, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1558002038-1055907df827?w=400&q=80'] },
    { id: 106, nombre: 'Set de Destornilladores Imantados Stanley (6 piezas)', descripcion: 'Juego de destornilladores profesionales con mangos ergonómicos trilobulares y puntas magnéticas fosfatadas. Incluye planos y Philips.', sku: 'FER-SET-DES-IM6', categoria: 'Herramientas Manuales', precio: 39.90, stock: 80, peso: 0.8, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80'] },
    { id: 107, nombre: 'Pintura Látex CPP Pato Premium - Blanco (4 Galones)', descripcion: 'Pintura látex premium de alta lavabilidad, excelente cubrimiento y acabado mate. Especial para interiores y exteriores en zonas de alta humedad.', sku: 'FER-PIN-PAT-BL4', categoria: 'Pinturas & Acabados', precio: 189.00, stock: 30, peso: 22.0, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80'] },
    { id: 108, nombre: 'Candado de Acero Blindado Forte 60mm', descripcion: 'Candado de máxima seguridad blindado con cuerpo de bronce y coraza de acero endurecido. Sistema de pines antitaladro y antiganzúa.', sku: 'FER-CAN-FOR-60', categoria: 'Cerrajería & Seguridad', precio: 59.90, stock: 55, peso: 0.6, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1558002038-1055907df827?w=400&q=80'] },
    { id: 109, nombre: 'Rotomartillo SDS Plus Makita 800W', descripcion: 'Rotomartillo Makita HR2470. Tres modos de operación: rotación, percusión con rotación y cincelado. Energía de impacto de 2.7 Joules.', sku: 'FER-ROT-MAK-800W', categoria: 'Herramientas Eléctricas', precio: 679.00, stock: 8, peso: 3.2, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80'] },
    { id: 110, nombre: 'Martillo de Uña Tramontina Acero Carbono', descripcion: 'Martillo de carpintero con cabeza forjada y templada en acero especial. Mango de madera fijado mediante cuña metálica para mayor firmeza.', sku: 'FER-MAR-TRA-AC', categoria: 'Herramientas Manuales', precio: 29.90, stock: 100, peso: 0.7, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80'] },
    { id: 111, nombre: 'Wincha Métrica Stanley Powerlock 8m/26ft', descripcion: 'Cinta métrica profesional Powerlock con botón de bloqueo. Hoja recubierta con Mylar antidesgaste y gancho de tres remaches.', sku: 'FER-WIN-STA-8M', categoria: 'Herramientas Manuales', precio: 42.00, stock: 65, peso: 0.4, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80'] },
    { id: 112, nombre: 'Linterna LED Recargable de Alta Potencia', descripcion: 'Linterna táctica metálica recargable mediante USB. Chip LED T6 de 1000 lúmenes con zoom ajustable y 5 modos de iluminación.', sku: 'FER-LIN-LED-REC', categoria: 'Electricidad & Iluminación', precio: 49.90, stock: 90, peso: 0.5, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1558002038-1055907df827?w=400&q=80'] },
    { id: 113, nombre: 'Juego de Llaves Mixtas Stanley (12 piezas)', descripcion: 'Set de llaves combinadas (corona y boca) en pulgadas o milímetros. Acabado cromado anticorrosivo con estuche organizador plástico.', sku: 'FER-JUE-LLA-MIX12', categoria: 'Herramientas Manuales', precio: 119.00, stock: 22, peso: 1.8, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80'] },
    { id: 114, nombre: 'Sierra Circular Black+Decker 1500W', descripcion: 'Sierra circular con motor de 1500W y disco de carburo de 7 1/4" (184mm). Ajuste de bisel de hasta 45 grados y guía láser integrada.', sku: 'FER-SIE-BDE-1500W', categoria: 'Herramientas Eléctricas', precio: 319.00, stock: 14, peso: 4.1, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80'] },
    { id: 115, nombre: 'Cable Eléctrico Indeco Nro 12 THW (100m, Rojo)', descripcion: 'Rollo de 100 metros de cable de cobre recocido Indeco. Aislamiento de PVC resistente a la humedad y retardante a la llama.', sku: 'FER-CAB-IND-12R', categoria: 'Electricidad & Iluminación', precio: 219.00, stock: 40, peso: 3.8, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1558002038-1055907df827?w=400&q=80'] },
    { id: 116, nombre: 'Set de Brochas Atlas Premium (3 piezas)', descripcion: 'Juego de tres brochas de cerdas sintéticas finas de 1", 2" y 3" de ancho. Mango de madera natural con virola metálica insignia.', sku: 'FER-BRO-ATL-S3', categoria: 'Pinturas & Acabados', precio: 24.50, stock: 110, peso: 0.3, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80'] },
    { id: 117, nombre: 'Cinta Aisladora 3M Temflex (Caja 10 unidades)', descripcion: 'Cinta aisladora de vinilo de alta flexibilidad. Excelente aislamiento dieléctrico y resistencia a la intemperie. Caja de 10 rollos.', sku: 'FER-CIN-3M-TEM10', categoria: 'Electricidad & Iluminación', precio: 35.00, stock: 150, peso: 0.5, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1558002038-1055907df827?w=400&q=80'] },
    { id: 118, nombre: 'Nivel de Burbuja de Aluminio Stanley 24"', descripcion: 'Nivel profesional de aleación de aluminio extruido de 24 pulgadas. Cuenta con 3 burbujas (plomada, nivel y 45°) protegidas contra impactos.', sku: 'FER-NIV-STA-24', categoria: 'Herramientas Manuales', precio: 55.00, stock: 35, peso: 0.8, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80'] },
    { id: 119, nombre: 'Candado de Combinación TSA Yale Latón', descripcion: 'Candado para maletas o casilleros homologado por la TSA. Cuerpo de latón y combinación programable de 3 dígitos.', sku: 'FER-CAN-YAL-TSA', categoria: 'Cerrajería & Seguridad', precio: 45.00, stock: 0, peso: 0.1, estado: 'SIN_STOCK', imagenes: ['https://images.unsplash.com/photo-1558002038-1055907df827?w=400&q=80'] },
    { id: 120, nombre: 'Compresora de Aire Truper 24 Litros 2.5HP', descripcion: 'Compresora lubricada por aceite de alta eficiencia. Tanque de 24L con motor monofásico de inducción de 2.5 caballos de fuerza.', sku: 'FER-COM-TRU-24L', categoria: 'Herramientas Eléctricas', precio: 499.00, stock: 6, peso: 18.5, estado: 'ACTIVO', imagenes: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80'] }
  ]);

  // 3. Movimientos de Inventario
  readonly inventoryMovements = signal<InventoryMovement[]>([
    { id: 501, fecha: '2026-05-30T10:30:00-05:00', productoId: 101, productoNombre: 'Taladro Percutor DeWalt 20V Max', sku: 'FER-TAL-DEW-20V', cantidad: 8, tipo: 'ENTRADA', observacion: 'Ingreso por despacho del importador autorizado' },
    { id: 502, fecha: '2026-05-29T15:45:00-05:00', productoId: 102, productoNombre: 'Juego de Herramientas Stanley (110 piezas)', sku: 'FER-JUE-STA-110P', cantidad: -2, tipo: 'SALIDA', observacion: 'Venta realizada Pedido #PED-7768' },
    { id: 503, fecha: '2026-05-28T09:00:00-05:00', productoId: 105, productoNombre: 'Cerradura Digital Inteligente Yale YDF40', sku: 'FER-CER-YAL-DIG', cantidad: -1, tipo: 'SALIDA', observacion: 'Venta realizada Pedido #PED-7762' },
    { id: 504, fecha: '2026-05-27T11:20:00-05:00', productoId: 108, productoNombre: 'Candado de Acero Blindado Forte 60mm', sku: 'FER-CAN-FOR-60', cantidad: 50, tipo: 'ENTRADA', observacion: 'Abastecimiento de fábrica de Forte' },
    { id: 505, fecha: '2026-05-25T16:10:00-05:00', productoId: 119, productoNombre: 'Candado de Combinación TSA Yale Latón', sku: 'FER-CAN-YAL-TSA', cantidad: -1, tipo: 'AJUSTE', observacion: 'Mermas por rotura de blister en exhibidor' },
    { id: 506, fecha: '2026-05-24T08:15:00-05:00', productoId: 101, productoNombre: 'Taladro Percutor DeWalt 20V Max', sku: 'FER-TAL-DEW-20V', cantidad: 12, tipo: 'AJUSTE', observacion: 'Ajuste e inventario de auditoría física' }
  ]);

  // 4. Pedidos
  readonly orders = signal<SellerOrder[]>([
    {
      id: 2001,
      numeroPedido: 'PED-7768',
      fecha: '2026-05-31T20:15:00-05:00',
      clienteNombre: 'Carlos Mendoza',
      clienteCorreo: 'carlos.mendoza@gmail.com',
      items: [
        { id: 3001, productoId: 101, productoNombre: 'Taladro Percutor DeWalt 20V Max', sku: 'FER-TAL-DEW-20V', precio: 489.00, cantidad: 1, imagen: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=100' },
        { id: 3002, productoId: 102, productoNombre: 'Juego de Herramientas Stanley (110 piezas)', sku: 'FER-JUE-STA-110P', precio: 299.90, cantidad: 1, imagen: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100' }
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
        { id: 3003, productoId: 108, productoNombre: 'Candado de Acero Blindado Forte 60mm', sku: 'FER-CAN-FOR-60', precio: 59.90, cantidad: 4, imagen: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=100' }
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
        { id: 3004, productoId: 105, productoNombre: 'Cerradura Digital Inteligente Yale YDF40', sku: 'FER-CER-YAL-DIG', precio: 389.00, cantidad: 1, imagen: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=100' }
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
        { id: 3005, productoId: 107, productoNombre: 'Pintura Látex CPP Pato Premium - Blanco (4 Galones)', sku: 'FER-PIN-PAT-BL4', precio: 189.00, cantidad: 2, imagen: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=100' },
        { id: 3006, productoId: 111, productoNombre: 'Wincha Métrica Stanley Powerlock 8m/26ft', sku: 'FER-WIN-STA-8M', precio: 42.00, cantidad: 1, imagen: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100' }
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
        { id: 3007, productoId: 101, productoNombre: 'Taladro Percutor DeWalt 20V Max', sku: 'FER-TAL-DEW-20V', precio: 489.00, cantidad: 1, imagen: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=100' }
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
      compradorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
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
      compradorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
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
      compradorAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&auto=format&fit=crop&q=80',
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
        imagen: item?.imagen ?? item?.imagenes?.[0] ?? 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=100'
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
      compradorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
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
    return forkJoin({
      store: this.http.get<any>(`${this.baseUrl}/vendedores/mi-tienda`),
      categories: this.http.get<any[]>(`${this.baseUrl}/categorias`),
      products: this.http.get<any[]>(`${this.baseUrl}/productos`),
      orders: this.http.get<any[]>(`${this.baseUrl}/pedidos/tienda`),
      notifications: this.http.get<any[]>(`${this.baseUrl}/notificaciones`),
      conversations: this.http.get<any[]>(`${this.baseUrl}/chat/conversaciones`)
    }).pipe(
      tap(({ store, categories, products, orders, notifications, conversations }) => {
        this.storeProfile.set(this.normalizeStoreProfile(store));
        this.categories.set(categories.map(cat => ({ id: Number(cat?.id ?? 0), nombre: cat?.nombre ?? '' })));
        this.products.set(products.map(p => this.normalizeProduct(p)));
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

  // Enviar mensaje en Chat
  sendChatMessage(conversationId: number, contenido: string): Observable<SellerMessage> {
    const conv = this.conversations().find(c => c.id === conversationId);
    if (!conv) return throwError(() => new Error('Conversación no encontrada'));

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
