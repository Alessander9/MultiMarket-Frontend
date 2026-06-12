import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, tap, map } from 'rxjs';
import { environment } from '../../environments/environment';

// ==========================================
// Strongly Typed Interfaces for the 17 Modules
// ==========================================
export interface AdminUser {
  id: number;
  correo: string;
  roles: string[];
  estado: boolean;
  correoVerificado: boolean;
  fechaRegistro: string;
  intentosFallidos: number;
  bloqueado: boolean;
}

export interface AdminRole {
  id: number;
  nombre: string;
  descripcion: string;
  permisos: string[];
}

export interface AdminVendor {
  id: number;
  nombreTienda: string;
  descripcion: string;
  region: string;
  direccion: string;
  logo: string;
  banner: string;
  activo: boolean;
  fechaCreacion: string;
  calificacionPromedio: number;
}

export interface AdminCategory {
  id: number;
  nombre: string;
  descripcion: string;
  activa: boolean;
}

export interface AdminProduct {
  id: number;
  nombre: string;
  descripcion: string;
  sku: string;
  categoriaId: number;
  categoriaNombre?: string;
  vendedorId: number;
  vendedorNombre?: string;
  precio: number;
  stock: number;
  peso: number;
  activo: boolean;
  fechaCreacion: string;
  imagenes: string[];
}

export interface InventoryMovement {
  id: number;
  productoId: number;
  productoNombre: string;
  cantidad: number;
  tipoMovimiento: 'ENTRADA' | 'SALIDA' | 'DEVOLUCION' | 'AJUSTE';
  observacion: string;
  fechaMovimiento: string;
}

export interface AdminOrderDetail {
  productoId: number;
  productoNombre: string;
  sku: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface AdminOrder {
  id: number;
  numeroPedido: string;
  fechaPedido: string;
  subtotal: number;
  impuesto: number;
  costoEnvio: number;
  total: number;
  estado: 'PENDIENTE' | 'PAGADO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
  compradorCorreo: string;
  compradorNombre: string;
  vendedorNombre: string;
  vendedorId: number;
  metodoPago?: string;
  codigoOperacion?: string;
  detalles: AdminOrderDetail[];
}

export interface AdminPayment {
  id: number;
  pedidoNumero: string;
  monto: number;
  metodoPago: 'VISA' | 'MASTERCARD' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA';
  estadoPago: 'APROBADO' | 'FALLIDO' | 'REEMBOLSADO';
  fechaPago: string;
  codigoOperacion: string;
}

export interface SOAPLog {
  id: number;
  tipoOperacion: 'VALIDAR_TARJETA' | 'PROCESAR_PAGO' | 'CONSULTAR_TRANS';
  estado: 'EXITOSA' | 'RECHAZADA' | 'ERROR';
  fecha: string;
  requestXml: string;
  responseXml: string;
}

export interface AdminChat {
  id: number;
  fechaCreacion: string;
  activa: boolean;
  compradorCorreo: string;
  vendedorNombre: string;
  ultimoMensaje: string;
  mensajes: { remitente: string; contenido: string; fecha: string }[];
}

export interface AdminNotification {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: 'PEDIDO' | 'PAGO' | 'CHAT' | 'SISTEMA';
  destinatarios: 'TODOS' | 'COMPRADORES' | 'VENDEDORES';
  fechaCreacion: string;
}

export interface XmlImportLog {
  id: number;
  nombreArchivo: string;
  fechaImportacion: string;
  totalRegistros: number;
  registrosCorrectos: number;
  registrosError: number;
  estado: 'COMPLETADO' | 'FALLIDO';
}

export interface JsonXmlExportLog {
  id: number;
  formato: 'JSON' | 'XML';
  fechaExportacion: string;
  rutaArchivo: string;
  estado: 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADO' | 'ERROR';
}

@Injectable({
  providedIn: 'root'
})
export class AdminPortalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private normalizeProduct(product: any): AdminProduct {
    return {
      ...product,
      precio: Number(product?.precio ?? 0),
      stock: Number(product?.stock ?? 0),
      peso: Number(product?.peso ?? 0),
      vendedorNombre: product?.vendedorNombre ?? product?.tiendaNombre,
      imagenes: product?.imagenes ? product.imagenes.map((img: any) => typeof img === 'string' ? img : img?.url).filter(Boolean) : []
    };
  }

  private normalizeOrder(order: any): AdminOrder {
    return {
      ...order,
      subtotal: Number(order?.subtotal ?? 0),
      impuesto: Number(order?.impuesto ?? 0),
      costoEnvio: Number(order?.costoEnvio ?? 0),
      total: Number(order?.total ?? 0),
      vendedorNombre: order?.vendedorNombre ?? order?.vendedorTienda
    };
  }

  // ==========================================
  // In-Memory Databases (Angular Signals)
  // ==========================================
  readonly users = signal<AdminUser[]>([
    { id: 1, correo: 'admin@multimarket.com', roles: ['ADMIN'], estado: true, correoVerificado: true, fechaRegistro: '2026-05-01', intentosFallidos: 0, bloqueado: false },
    { id: 2, correo: 'vendedor@multimarket.com', roles: ['VENDEDOR'], estado: true, correoVerificado: true, fechaRegistro: '2026-05-12', intentosFallidos: 0, bloqueado: false },
    { id: 3, correo: 'comprador@multimarket.com', roles: ['COMPRADOR'], estado: true, correoVerificado: true, fechaRegistro: '2026-05-15', intentosFallidos: 0, bloqueado: false },
    { id: 4, correo: 'pedro@correo.com', roles: ['COMPRADOR'], estado: true, correoVerificado: false, fechaRegistro: '2026-05-20', intentosFallidos: 3, bloqueado: false },
    { id: 5, correo: 'bloqueado@correo.com', roles: ['VENDEDOR'], estado: false, correoVerificado: true, fechaRegistro: '2026-05-22', intentosFallidos: 5, bloqueado: true }
  ]);

  readonly roles = signal<AdminRole[]>([
    { id: 1, nombre: 'ADMIN', descripcion: 'Administrador general del sistema con acceso a logs, servicios y configuraciones de auditoría.', permisos: ['read', 'write', 'delete', 'admin'] },
    { id: 2, nombre: 'VENDEDOR', descripcion: 'Vendedor del marketplace. Administra tiendas, stock, pedidos propios y exportaciones.', permisos: ['read', 'write'] },
    { id: 3, nombre: 'COMPRADOR', descripcion: 'Comprador o cliente final. Realiza búsquedas, agrega favoritos, chatea y procesa pagos.', permisos: ['read'] }
  ]);

  readonly vendors = signal<AdminVendor[]>([
    { id: 1, nombreTienda: 'Cafetería del Centro', descripcion: 'Los mejores cafés orgánicos de Cusco tostados al natural.', region: 'Cusco', direccion: 'Portal de Panes 123', logo: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=100', banner: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600', activo: true, fechaCreacion: '2026-05-01', calificacionPromedio: 4.8 },
    { id: 2, nombreTienda: 'Chocolates El Ceibo', descripcion: 'Cacao fino de aroma cosechado por comunidades locales.', region: 'Amazonas', direccion: 'Jr. Triunfo 456', logo: 'https://images.unsplash.com/photo-1548907040-4d42b52125e0?w=100', banner: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=600', activo: true, fechaCreacion: '2026-05-12', calificacionPromedio: 4.7 },
    { id: 3, nombreTienda: 'Artesanías Andinas', descripcion: 'Textiles, cerámicas y platería hechos a mano.', region: 'Puno', direccion: 'Av. Floral 890', logo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=100', banner: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600', activo: true, fechaCreacion: '2026-05-15', calificacionPromedio: 4.5 },
    { id: 4, nombreTienda: 'Ferretería Cleo', descripcion: 'Líderes en distribución de herramientas manuales, eléctricas, materiales de construcción, cerrajería, iluminación y acabados para el hogar. Más de 15 años brindando soluciones confiables a maestros de obra, talleres industriales, artesanos y familias de Lima Norte.', region: 'Lima', direccion: 'Av. Alfredo Mendiola 3540, Los Olivos, Lima', logo: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100', banner: 'https://images.unsplash.com/photo-1513828722001-c22dbf88279e?w=600', activo: true, fechaCreacion: '2026-05-25', calificacionPromedio: 4.9 },
    { id: 5, nombreTienda: 'Cusco Premium Café', descripcion: 'Café premium seleccionado artesanalmente de los valles del Cusco.', region: 'Cusco', direccion: 'Av. Sol 420, Cusco', logo: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=100', banner: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.8 },
    { id: 6, nombreTienda: 'Dulce Amazonía', descripcion: 'Barras artesanales de chocolate con frutas exóticas del Amazonas.', region: 'Amazonas', direccion: 'Chachapoyas 789', logo: 'https://images.unsplash.com/photo-1548907040-4d42b52125e0?w=100', banner: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.7 },
    { id: 7, nombreTienda: 'Textil Cusco Imperial', descripcion: 'Chompas, mantas y chalinas tejidas con fina alpaca baby.', region: 'Cusco', direccion: 'Calle Hatun Rumiyoc 210, Cusco', logo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=100', banner: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.6 },
    { id: 8, nombreTienda: 'Apícola del Bosque', descripcion: 'Miel de abeja 100% pura recolectada de flores silvestres del norte.', region: 'Lambayeque', direccion: 'Av. Balta 654, Chiclayo', logo: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=100', banner: 'https://images.unsplash.com/photo-1471943033881-a17e6a14e3d1?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.7 },
    { id: 9, nombreTienda: 'Cerámicas Pucará', descripcion: 'Toritos de Pucará y artesanías pintadas a mano de alta calidad.', region: 'Puno', direccion: 'Jr. Lima 321, Puno', logo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=100', banner: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.5 },
    { id: 10, nombreTienda: 'Café San Martín Gourmet', descripcion: 'Café de alta calidad con notas dulces y afrutadas de Moyobamba.', region: 'San Martín', direccion: 'Jr. San Martín 150, Moyobamba', logo: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=100', banner: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.8 },
    { id: 11, nombreTienda: 'Chocolates Quillabamba', descripcion: 'Chocolate orgánico al 70% elaborado con cacao chuncho premium.', region: 'Cusco', direccion: 'Calle Espinar 450, Cusco', logo: 'https://images.unsplash.com/photo-1548907040-4d42b52125e0?w=100', banner: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.7 },
    { id: 12, nombreTienda: 'Orfebrería del Sur', descripcion: 'Joyas de plata de 950 hechas por experimentados plateros.', region: 'Arequipa', direccion: 'Calle Santa Catalina 111, Arequipa', logo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=100', banner: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.6 },
    { id: 13, nombreTienda: 'Textil Altiplano', descripcion: 'Prendas típicas de abrigo tejidas con lana pura de oveja y alpaca.', region: 'Puno', direccion: 'Jr. Deustua 550, Puno', logo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=100', banner: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.5 },
    { id: 14, nombreTienda: 'Miel de La Libertad', descripcion: 'Miel pura y derivados apícolas como polen y jalea real.', region: 'La Libertad', direccion: 'Av. Larco 880, Trujillo', logo: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=100', banner: 'https://images.unsplash.com/photo-1471943033881-a17e6a14e3d1?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.7 },
    { id: 15, nombreTienda: 'Ferretería Norte', descripcion: 'Amplio catálogo de herramientas eléctricas profesionales y acabados.', region: 'Piura', direccion: 'Av. Grau 1200, Piura', logo: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100', banner: 'https://images.unsplash.com/photo-1513828722001-c22dbf88279e?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.6 },
    { id: 16, nombreTienda: 'Café Chanchamayo', descripcion: 'Café cultivado en la selva central con un aroma inconfundible.', region: 'Junín', direccion: 'Av. Tarma 340, La Merced', logo: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=100', banner: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.8 },
    { id: 17, nombreTienda: 'Granos Cajamarca', descripcion: 'Café gourmet producido bajo sombra en fincas cajamarquinas.', region: 'Cajamarca', direccion: 'Jr. Comercio 560, Cajamarca', logo: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=100', banner: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.8 },
    { id: 18, nombreTienda: 'Artesanías de Piura', descripcion: 'Trabajos finos de filigrana de plata de Catacaos.', region: 'Piura', direccion: 'Jr. Comercio Catacaos 220', logo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=100', banner: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.6 },
    { id: 19, nombreTienda: 'Textil Alpaca Real', descripcion: 'Colección de chompas de alpaca y accesorios de moda sostenible.', region: 'Arequipa', direccion: 'Calle Mercaderes 305, Arequipa', logo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=100', banner: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.8 },
    { id: 20, nombreTienda: 'Miel Andina', descripcion: 'Miel multifloral orgánica de los valles sagrados.', region: 'Cusco', direccion: 'Urubamba Sector Central, Cusco', logo: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=100', banner: 'https://images.unsplash.com/photo-1471943033881-a17e6a14e3d1?w=600', activo: true, fechaCreacion: '2026-05-26', calificacionPromedio: 4.7 }
  ]);

  readonly categories = signal<AdminCategory[]>([
    { id: 1, nombre: 'Café', descripcion: 'Granos de café regionales y mezclas de altura.', activa: true },
    { id: 2, nombre: 'Chocolate', descripcion: 'Barras de chocolate, bombones y cacao en polvo.', activa: true },
    { id: 3, nombre: 'Artesanías', descripcion: 'Cerámicas, platería, retablos y manualidades tradicionales.', activa: true },
    { id: 4, nombre: 'Textiles', descripcion: 'Mantados, chalinas, chompas de alpaca y prendas típicas.', activa: true },
    { id: 5, nombre: 'Miel', descripcion: 'Miel de abeja pura y derivados apícolas.', activa: true },
    { id: 6, nombre: 'Ferretería', descripcion: 'Herramientas manuales, eléctricas y accesorios de construcción.', activa: true }
  ]);

  readonly products = signal<AdminProduct[]>([
    { id: 1, nombre: 'Café Cusco Premium', descripcion: 'Café de altura 100% orgánico de grano seleccionado.', sku: 'CAF-CUS-001', categoriaId: 1, vendedorId: 1, precio: 35.00, stock: 45, peso: 0.50, activo: true, fechaCreacion: '2026-05-02', imagenes: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300'] },
    { id: 2, nombre: 'Chocolate Amargo 70%', descripcion: 'Chocolate de origen fino de aroma con notas de frutos secos.', sku: 'CHO-AMA-070', categoriaId: 2, vendedorId: 2, precio: 12.50, stock: 120, peso: 0.10, activo: true, fechaCreacion: '2026-05-13', imagenes: ['https://images.unsplash.com/photo-1548907040-4d42b52125e0?w=300'] },
    { id: 3, nombre: 'Retablo Ayacuchano Mediano', descripcion: 'Escena tradicional andina tallada a mano en madera y pasta.', sku: 'ART-RET-AY2', categoriaId: 3, vendedorId: 3, precio: 85.00, stock: 8, peso: 1.20, activo: true, fechaCreacion: '2026-05-16', imagenes: ['https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300'] },
    { id: 4, nombre: 'Chalina de Alpaca Baby', descripcion: 'Chalina tejida con pura alpaca suave y abrigadora.', sku: 'TEX-CHA-ALP', categoriaId: 4, vendedorId: 3, precio: 120.00, stock: 3, peso: 0.25, activo: true, fechaCreacion: '2026-05-18', imagenes: ['https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=300'] },
    { id: 5, nombre: 'Miel de Abeja Silvestre', descripcion: 'Miel cosechada en bosques del norte totalmente cruda.', sku: 'MIE-SIL-001', categoriaId: 5, vendedorId: 1, precio: 22.00, stock: 50, peso: 0.60, activo: true, fechaCreacion: '2026-05-20', imagenes: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300'] },
    { id: 101, nombre: 'Taladro Percutor DeWalt 20V Max', descripcion: 'Taladro percutor inalámbrico Brushless de alta potencia. Incluye 2 baterías de litio, cargador y maletín.', sku: 'FER-TAL-DEW-20V', categoriaId: 6, vendedorId: 4, precio: 489.00, stock: 25, peso: 2.40, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300'] },
    { id: 102, nombre: 'Juego de Herramientas Stanley (110 piezas)', descripcion: 'Completo maletín de herramientas mecánicas de acero cromo vanadio.', sku: 'FER-JUE-STA-110P', categoriaId: 6, vendedorId: 4, precio: 299.90, stock: 15, peso: 6.50, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300'] },
    { id: 103, nombre: 'Amoladora Angular Bosch 4 1/2" 850W', descripcion: 'Amoladora angular profesional Bosch GWS 850 con empuñadura auxiliar ergonómica.', sku: 'FER-AMO-BOS-4.5', categoriaId: 6, vendedorId: 4, precio: 249.00, stock: 18, peso: 1.90, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300'] },
    { id: 104, nombre: 'Caja de Herramientas Tramontina Plástica 20"', descripcion: 'Caja portaherramientas plástica de alta resistencia con cierres metálicos.', sku: 'FER-CAJ-TRA-20', categoriaId: 6, vendedorId: 4, precio: 69.90, stock: 40, peso: 2.00, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300'] },
    { id: 105, nombre: 'Cerradura Digital Inteligente Yale YDF40', descripcion: 'Cerradura biométrica digital para puertas de madera o metal.', sku: 'FER-CER-YAL-DIG', categoriaId: 6, vendedorId: 4, precio: 389.00, stock: 12, peso: 1.50, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1558002038-1055907df827?w=300'] },
    { id: 106, nombre: 'Set de Destornilladores Imantados Stanley (6 piezas)', descripcion: 'Destornilladores profesionales con mangos ergonómicos trilobulares.', sku: 'FER-SET-DES-IM6', categoriaId: 6, vendedorId: 4, precio: 39.90, stock: 80, peso: 0.80, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300'] },
    { id: 107, nombre: 'Pintura Látex CPP Pato Premium - Blanco', descripcion: 'Pintura látex premium de alta lavabilidad y excelente cubrimiento.', sku: 'FER-PIN-PAT-BL4', categoriaId: 6, vendedorId: 4, precio: 189.00, stock: 30, peso: 22.00, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=300'] },
    { id: 108, nombre: 'Candado de Acero Blindado Forte 60mm', descripcion: 'Candado de máxima seguridad blindado con cuerpo de bronce.', sku: 'FER-CAN-FOR-60', categoriaId: 6, vendedorId: 4, precio: 59.90, stock: 55, peso: 0.60, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1558002038-1055907df827?w=300'] },
    { id: 109, nombre: 'Rotomartillo SDS Plus Makita 800W', descripcion: 'Rotomartillo profesional con tres modos de operación Makita.', sku: 'FER-ROT-MAK-800W', categoriaId: 6, vendedorId: 4, precio: 679.00, stock: 8, peso: 3.20, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300'] },
    { id: 110, nombre: 'Martillo de Uña Tramontina Acero Carbono', descripcion: 'Martillo de carpintero con cabeza forjada de alta dureza.', sku: 'FER-MAR-TRA-AC', categoriaId: 6, vendedorId: 4, precio: 29.90, stock: 100, peso: 0.70, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300'] },
    { id: 111, nombre: 'Wincha Métrica Stanley Powerlock 8m', descripcion: 'Cinta métrica profesional con revestimiento antidesgaste.', sku: 'FER-WIN-STA-8M', categoriaId: 6, vendedorId: 4, precio: 42.00, stock: 65, peso: 0.40, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300'] },
    { id: 112, nombre: 'Linterna LED Recargable de Alta Potencia', descripcion: 'Linterna táctica metálica recargable mediante puerto USB.', sku: 'FER-LIN-LED-REC', categoriaId: 6, vendedorId: 4, precio: 49.90, stock: 90, peso: 0.50, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1558002038-1055907df827?w=300'] },
    { id: 113, nombre: 'Juego de Llaves Mixtas Stanley (12 piezas)', descripcion: 'Set de llaves combinadas corona y boca de acero pulido.', sku: 'FER-JUE-LLA-MIX12', categoriaId: 6, vendedorId: 4, precio: 119.00, stock: 22, peso: 1.80, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300'] },
    { id: 114, nombre: 'Sierra Circular Black+Decker 1500W', descripcion: 'Sierra circular con disco de carburo y guía de precisión.', sku: 'FER-SIE-BDE-1500W', categoriaId: 6, vendedorId: 4, precio: 319.00, stock: 14, peso: 4.10, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300'] },
    { id: 115, nombre: 'Cable Eléctrico Indeco Nro 12 THW (100m)', descripcion: 'Rollo de cable de cobre recocido con cubierta de PVC retardante.', sku: 'FER-CAB-IND-12R', categoriaId: 6, vendedorId: 4, precio: 219.00, stock: 40, peso: 3.80, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1558002038-1055907df827?w=300'] },
    { id: 116, nombre: 'Set de Brochas Atlas Premium (3 piezas)', descripcion: 'Brochas profesionales de fibra fina sintética para acabados.', sku: 'FER-BRO-ATL-S3', categoriaId: 6, vendedorId: 4, precio: 24.50, stock: 110, peso: 0.30, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=300'] },
    { id: 117, nombre: 'Cinta Aisladora 3M Temflex (Caja 10 und)', descripcion: 'Cinta de vinilo de alta flexibilidad para aislamiento eléctrico.', sku: 'FER-CIN-3M-TEM10', categoriaId: 6, vendedorId: 4, precio: 35.00, stock: 150, peso: 0.50, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1558002038-1055907df827?w=300'] },
    { id: 118, nombre: 'Nivel de Burbuja de Aluminio Stanley 24"', descripcion: 'Nivel profesional resistente a impactos y deformaciones.', sku: 'FER-NIV-STA-24', categoriaId: 6, vendedorId: 4, precio: 55.00, stock: 35, peso: 0.80, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300'] },
    { id: 119, nombre: 'Candado de Combinación TSA Yale Latón', descripcion: 'Candado programable de 3 dígitos homologado para equipaje.', sku: 'FER-CAN-YAL-TSA', categoriaId: 6, vendedorId: 4, precio: 45.00, stock: 10, peso: 0.10, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1558002038-1055907df827?w=300'] },
    { id: 120, nombre: 'Compresora de Aire Truper 24 Litros 2.5HP', descripcion: 'Compresora de aire monofásica lubricada para uso constante.', sku: 'FER-COM-TRU-24L', categoriaId: 6, vendedorId: 4, precio: 499.00, stock: 6, peso: 18.50, activo: true, fechaCreacion: '2026-05-25', imagenes: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300'] }
  ]);

  readonly inventoryMovements = signal<InventoryMovement[]>([
    { id: 1, productoId: 1, productoNombre: 'Café Cusco Premium', cantidad: 50, tipoMovimiento: 'ENTRADA', observacion: 'Ingreso inicial por importación XML.', fechaMovimiento: '2026-05-02 10:15' },
    { id: 2, productoId: 1, productoNombre: 'Café Cusco Premium', cantidad: 5, tipoMovimiento: 'SALIDA', observacion: 'Venta realizada pedido #PED-01.', fechaMovimiento: '2026-05-03 14:30' },
    { id: 3, productoId: 4, productoNombre: 'Chalina de Alpaca Baby', cantidad: 1, tipoMovimiento: 'AJUSTE', observacion: 'Corrección manual de stock por merma.', fechaMovimiento: '2026-05-20 11:00' }
  ]);

  readonly orders = signal<AdminOrder[]>([
    {
      id: 1,
      numeroPedido: 'PED-9092-A',
      fechaPedido: '2026-05-28',
      subtotal: 70.00,
      impuesto: 12.60,
      costoEnvio: 10.00,
      total: 92.60,
      estado: 'PAGADO',
      compradorCorreo: 'comprador@multimarket.com',
      compradorNombre: 'Maria Comprador',
      vendedorNombre: 'Cafetería del Centro',
      vendedorId: 1,
      metodoPago: 'VISA',
      codigoOperacion: 'OP-4F3D2E',
      detalles: [
        { productoId: 1, productoNombre: 'Café Cusco Premium', sku: 'CAF-CUS-001', cantidad: 2, precioUnitario: 35.00, subtotal: 70.00 }
      ]
    },
    {
      id: 2,
      numeroPedido: 'PED-1120-B',
      fechaPedido: '2026-05-30',
      subtotal: 25.00,
      impuesto: 4.50,
      costoEnvio: 8.00,
      total: 37.50,
      estado: 'PENDIENTE',
      compradorCorreo: 'pedro@correo.com',
      compradorNombre: 'Pedro Gomez',
      vendedorNombre: 'Chocolates El Ceibo',
      vendedorId: 2,
      detalles: [
        { productoId: 2, productoNombre: 'Chocolate Amargo 70%', sku: 'CHO-AMA-070', cantidad: 2, precioUnitario: 12.50, subtotal: 25.00 }
      ]
    }
  ]);

  readonly payments = signal<AdminPayment[]>([
    { id: 1, pedidoNumero: 'PED-9092-A', monto: 92.60, metodoPago: 'VISA', estadoPago: 'APROBADO', fechaPago: '2026-05-28 14:32', codigoOperacion: 'OP-4F3D2E' },
    { id: 2, pedidoNumero: 'PED-8812-X', monto: 120.00, metodoPago: 'MASTERCARD', estadoPago: 'FALLIDO', fechaPago: '2026-05-29 11:20', codigoOperacion: 'RECHAZADO_SALDO' }
  ]);

  readonly soapLogs = signal<SOAPLog[]>([
    {
      id: 1,
      tipoOperacion: 'PROCESAR_PAGO',
      estado: 'EXITOSA',
      fecha: '2026-05-28 14:32:11',
      requestXml: '<soapenv:Envelope xmlns:web="http://multimarket.com/payment"><soapenv:Body><web:procesarPago><web:numeroTarjeta>4111-XXXX-XXXX-1111</web:numeroTarjeta><web:monto>92.60</web:monto></web:procesarPago></soapenv:Body></soapenv:Envelope>',
      responseXml: '<soapenv:Envelope><soapenv:Body><web:procesarPagoResponse><web:codigoOperacion>OP-4F3D2E</web:codigoOperacion><web:estado>APROBADO</web:estado></web:procesarPagoResponse></soapenv:Body></soapenv:Envelope>'
    },
    {
      id: 2,
      tipoOperacion: 'PROCESAR_PAGO',
      estado: 'RECHAZADA',
      fecha: '2026-05-29 11:20:04',
      requestXml: '<soapenv:Envelope xmlns:web="http://multimarket.com/payment"><soapenv:Body><web:procesarPago><web:numeroTarjeta>5555-XXXX-XXXX-4444</web:numeroTarjeta><web:monto>120.00</web:monto></web:procesarPago></soapenv:Body></soapenv:Envelope>',
      responseXml: '<soapenv:Envelope><soapenv:Body><web:procesarPagoResponse><web:codigoOperacion>RECHAZADO_SALDO</web:codigoOperacion><web:estado>RECHAZADO</web:estado></web:procesarPagoResponse></soapenv:Body></soapenv:Envelope>'
    }
  ]);

  readonly chats = signal<AdminChat[]>([
    {
      id: 1,
      fechaCreacion: '2026-05-25',
      activa: true,
      compradorCorreo: 'comprador@multimarket.com',
      vendedorNombre: 'Cafetería del Centro',
      ultimoMensaje: 'Hola, ¿tienen stock disponible del café Cusco?',
      mensajes: [
        { remitente: 'comprador@multimarket.com', contenido: 'Hola, ¿tienen stock disponible del café Cusco?', fecha: '14:20' },
        { remitente: 'vendedor@multimarket.com', contenido: 'Hola, sí, tenemos stock fresco recién tostado listo.', fecha: '14:25' }
      ]
    }
  ]);

  readonly notifications = signal<AdminNotification[]>([
    { id: 1, titulo: 'Campaña de Invierno', mensaje: 'Cupón del 15% de descuento en textiles andinos.', tipo: 'SISTEMA', destinatarios: 'TODOS', fechaCreacion: '2026-05-20' },
    { id: 2, titulo: 'Ajuste de Comisiones', mensaje: 'Actualización en las tasas de venta por categoría.', tipo: 'SISTEMA', destinatarios: 'VENDEDORES', fechaCreacion: '2026-05-25' }
  ]);

  readonly xmlImports = signal<XmlImportLog[]>([
    { id: 1, nombreArchivo: 'catalogo_cusco_mayo.xml', fechaImportacion: '2026-05-02 10:14', totalRegistros: 15, registrosCorrectos: 15, registrosError: 0, estado: 'COMPLETADO' },
    { id: 2, nombreArchivo: 'incorrecto_productos.xml', fechaImportacion: '2026-05-18 16:30', totalRegistros: 5, registrosCorrectos: 3, registrosError: 2, estado: 'COMPLETADO' }
  ]);

  readonly exports = signal<JsonXmlExportLog[]>([
    { id: 1, formato: 'XML', fechaExportacion: '2026-05-29 11:00', rutaArchivo: '/exports/catalogo_xml_123.xml', estado: 'COMPLETADO' },
    { id: 2, formato: 'JSON', fechaExportacion: '2026-05-30 09:15', rutaArchivo: '/exports/catalogo_json_556.json', estado: 'COMPLETADO' }
  ]);

  // ==========================================
  // BACKEND-FED READ METHODS
  // ==========================================

  loadVendors(): Observable<AdminVendor[]> {
    return this.http.get<any[]>(`${this.baseUrl}/vendedores`).pipe(
      map(vendors => vendors.map(v => ({
        id: v.id,
        nombreTienda: v.nombreTienda,
        descripcion: v.descripcion,
        region: v.region,
        direccion: v.direccion,
        logo: v.logo,
        banner: v.banner,
        activo: v.activo ?? true,
        fechaCreacion: v.fechaCreacion ? v.fechaCreacion.split('T')[0] : new Date().toISOString().split('T')[0],
        calificacionPromedio: v.calificacionPromedio ?? 5
      }))),
      tap(vendors => this.vendors.set(vendors))
    );
  }

  loadCategories(): Observable<AdminCategory[]> {
    return this.http.get<any[]>(`${this.baseUrl}/categorias`).pipe(
      map(categories => categories.map(cat => ({
        id: cat.id,
        nombre: cat.nombre,
        descripcion: cat.descripcion,
        activa: cat.activa ?? true
      }))),
      tap(categories => this.categories.set(categories))
    );
  }

  loadProducts(): Observable<AdminProduct[]> {
    return this.http.get<any[]>(`${this.baseUrl}/productos`).pipe(
      map(products => products.map(product => this.normalizeProduct(product))),
      tap(products => this.products.set(products))
    );
  }

  loadOrders(): Observable<AdminOrder[]> {
    return this.http.get<any[]>(`${this.baseUrl}/pedidos/tienda`).pipe(
      map(orders => orders.map(order => this.normalizeOrder(order))),
      tap(orders => this.orders.set(orders))
    );
  }

  loadNotifications(): Observable<AdminNotification[]> {
    return this.http.get<any[]>(`${this.baseUrl}/notificaciones`).pipe(
      map(notifs => notifs.map(notif => ({
        id: notif.id,
        titulo: notif.titulo ?? notif.mensaje ?? 'Notificación',
        mensaje: notif.mensaje ?? notif.contenido ?? '',
        tipo: notif.tipo ?? 'SISTEMA',
        destinatarios: notif.destinatarios ?? 'TODOS',
        fechaCreacion: notif.fechaCreacion ?? notif.fecha ?? new Date().toISOString().split('T')[0]
      }))),
      tap(notifs => this.notifications.set(notifs))
    );
  }

  loadChats(): Observable<AdminChat[]> {
    return this.http.get<any[]>(`${this.baseUrl}/chat/conversaciones`).pipe(
      map(chats => chats.map(chat => ({
        id: chat.id,
        fechaCreacion: chat.fechaCreacion,
        activa: chat.activa,
        compradorCorreo: chat.compradorCorreo,
        vendedorNombre: chat.vendedorTienda ?? chat.vendedorNombreTienda,
        ultimoMensaje: chat.ultimoMensaje ?? '',
        mensajes: []
      }))),
      tap(chats => this.chats.set(chats))
    );
  }

  // ==========================================
  // In-Memory CRUD Operations (Reactive Signals)
  // ==========================================

  // Users CRUD
  addUser(user: Partial<AdminUser>): void {
    const newId = this.users().length > 0 ? Math.max(...this.users().map(u => u.id)) + 1 : 1;
    const fullUser: AdminUser = {
      id: newId,
      correo: user.correo || 'anonimo@correo.com',
      roles: user.roles || ['COMPRADOR'],
      estado: user.estado !== undefined ? user.estado : true,
      correoVerificado: true,
      fechaRegistro: new Date().toISOString().split('T')[0],
      intentosFallidos: 0,
      bloqueado: false
    };
    this.users.update(list => [...list, fullUser]);
  }

  updateUser(id: number, updatedUser: Partial<AdminUser>): void {
    this.users.update(list => list.map(u => u.id === id ? { ...u, ...updatedUser } : u));
  }

  deleteUser(id: number): void {
    this.users.update(list => list.filter(u => u.id !== id));
  }

  // Vendors CRUD
  addVendor(vendor: any): Observable<AdminVendor> {
    return this.http.post<any>(`${this.baseUrl}/vendedores`, vendor).pipe(
      map(created => {
        const fullVendor: AdminVendor = {
          id: created.id,
          nombreTienda: created.nombreTienda,
          descripcion: created.descripcion,
          region: created.region,
          direccion: created.direccion,
          logo: created.logo,
          banner: created.banner,
          activo: created.activo ?? true,
          fechaCreacion: created.fechaCreacion ? created.fechaCreacion.split('T')[0] : new Date().toISOString().split('T')[0],
          calificacionPromedio: created.calificacionPromedio ?? 5
        };
        this.vendors.update(list => [...list, fullVendor]);
        return fullVendor;
      })
    );
  }

  updateVendor(id: number, updated: Partial<AdminVendor>): Observable<AdminVendor> {
    return this.http.put<any>(`${this.baseUrl}/vendedores/${id}`, updated).pipe(
      map(result => {
        const fullVendor: AdminVendor = {
          id: result.id ?? id,
          nombreTienda: result.nombreTienda,
          descripcion: result.descripcion,
          region: result.region,
          direccion: result.direccion,
          logo: result.logo,
          banner: result.banner,
          activo: result.activo ?? true,
          fechaCreacion: result.fechaCreacion ?? new Date().toISOString().split('T')[0],
          calificacionPromedio: result.calificacionPromedio ?? 5
        };
        this.vendors.update(list => list.map(v => v.id === id ? fullVendor : v));
        return fullVendor;
      })
    );
  }

  deleteVendor(id: number): Observable<void> {
    return this.http.put<any>(`${this.baseUrl}/vendedores/${id}/desactivar`, null, {
      params: new HttpParams().set('activo', 'false')
    }).pipe(
      tap(() => {
        this.vendors.update(list => list.map(v => v.id === id ? { ...v, activo: false } : v));
      }),
      map(() => void 0)
    );
  }

  // Categories CRUD
  addCategory(cat: Partial<AdminCategory>): Observable<AdminCategory> {
    return this.http.post<any>(`${this.baseUrl}/categorias`, cat).pipe(
      map(created => {
        const fullCat: AdminCategory = {
          id: created.id,
          nombre: created.nombre,
          descripcion: created.descripcion,
          activa: created.activa ?? true
        };
        this.categories.update(list => [...list, fullCat]);
        return fullCat;
      })
    );
  }

  updateCategory(id: number, updated: Partial<AdminCategory>): Observable<AdminCategory> {
    return this.http.put<any>(`${this.baseUrl}/categorias/${id}`, updated).pipe(
      map(result => {
        const fullCat: AdminCategory = {
          id: result.id ?? id,
          nombre: result.nombre,
          descripcion: result.descripcion,
          activa: result.activa ?? true
        };
        this.categories.update(list => list.map(c => c.id === id ? fullCat : c));
        return fullCat;
      })
    );
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/categorias/${id}`).pipe(
      tap(() => {
        this.categories.update(list => list.filter(c => c.id !== id));
      })
    );
  }

  // Products CRUD
  addProduct(prod: Partial<AdminProduct>): Observable<AdminProduct> {
    return this.http.post<any>(`${this.baseUrl}/productos`, prod).pipe(
      map(created => {
        const fullProd = this.normalizeProduct(created);
        this.products.update(list => [...list, fullProd]);
        return fullProd;
      })
    );
  }

  updateProduct(id: number, updated: Partial<AdminProduct>): Observable<AdminProduct> {
    return this.http.put<any>(`${this.baseUrl}/productos/${id}`, updated).pipe(
      map(result => {
        const fullProd = this.normalizeProduct(result);
        this.products.update(list => list.map(p => p.id === id ? fullProd : p));
        return fullProd;
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

  // Chat / Notifications / Orders / Inventory remain partially mocked because the backend
  // does not expose the same admin-level management endpoints for every UI action yet.

  // Inventory Adjustments & Movements
  addInventoryMovement(productoId: number, productoNombre: string, cantidad: number, tipo: 'ENTRADA' | 'SALIDA' | 'DEVOLUCION' | 'AJUSTE', obs: string): void {
    const newId = this.inventoryMovements().length > 0 ? Math.max(...this.inventoryMovements().map(m => m.id)) + 1 : 1;
    const mov: InventoryMovement = {
      id: newId,
      productoId,
      productoNombre,
      cantidad,
      tipoMovimiento: tipo,
      observacion: obs,
      fechaMovimiento: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    this.inventoryMovements.update(list => [mov, ...list]); // Add on top of list
  }

  adjustInventory(productoId: number, cantidad: number, tipo: 'ENTRADA' | 'SALIDA' | 'DEVOLUCION' | 'AJUSTE', obs: string): void {
    const prod = this.products().find(p => p.id === productoId);
    if (!prod) return;

    let nuevoStock = prod.stock;
    if (tipo === 'ENTRADA' || tipo === 'DEVOLUCION') {
      nuevoStock += cantidad;
    } else {
      nuevoStock -= cantidad;
    }

    if (nuevoStock < 0) nuevoStock = 0;

    // Actualizar producto
    this.updateProduct(productoId, { ...prod, stock: nuevoStock }).subscribe({
      error: (err) => console.error('Error al actualizar stock del producto:', err)
    });
    // Registrar movimiento
    this.addInventoryMovement(productoId, prod.nombre, cantidad, tipo, obs);
  }

  // Order state update
  updateOrderStatus(orderId: number, nuevoEstado: 'PENDIENTE' | 'PAGADO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO'): void {
    this.orders.update(list => list.map(o => o.id === orderId ? { ...o, estado: nuevoEstado } : o));
  }

  // SOAP Transaction Payment Retry simulation
  retrySoapPayment(paymentId: number): Observable<string> {
    const payObj = this.payments().find(p => p.id === paymentId);
    if (!payObj) return of('Registro de pago no encontrado.');

    // Simular llamada SOAP
    const transactionId = 'OP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Cambiar estado del pago
    this.payments.update(list => list.map(p => p.id === paymentId ? { ...p, estadoPago: 'APROBADO', codigoOperacion: transactionId, fechaPago: new Date().toISOString().replace('T', ' ').substring(0, 16) } : p));
    
    // Registrar SOAP log
    const soapLogId = this.soapLogs().length + 1;
    this.soapLogs.update(logs => [
      {
        id: soapLogId,
        tipoOperacion: 'PROCESAR_PAGO',
        estado: 'EXITOSA',
        fecha: new Date().toISOString().replace('T', ' ').substring(0, 19),
        requestXml: '<soapenv:Envelope><soapenv:Body><web:reintentarPago><web:pedido>' + payObj.pedidoNumero + '</web:pedido></web:reintentarPago></soapenv:Body></soapenv:Envelope>',
        responseXml: '<soapenv:Envelope><soapenv:Body><web:reintentarPagoResponse><web:estado>APROBADO</web:estado><web:codigo>' + transactionId + '</web:codigo></web:reintentarPagoResponse></soapenv:Body></soapenv:Envelope>'
      },
      ...logs
    ]);

    return of(`Reintento SOAP JAX-WS exitoso. Pago Aprobado. Código de operación: ${transactionId}`);
  }

  // Create role
  addRole(role: Partial<AdminRole>): void {
    const newId = this.roles().length > 0 ? Math.max(...this.roles().map(r => r.id)) + 1 : 1;
    const fullRole: AdminRole = {
      id: newId,
      nombre: role.nombre || 'ROL_NUEVO',
      descripcion: role.descripcion || 'Sin descripción',
      permisos: role.permisos || ['read']
    };
    this.roles.update(list => [...list, fullRole]);
  }

  updateRole(id: number, updated: Partial<AdminRole>): void {
    this.roles.update(list => list.map(r => r.id === id ? { ...r, ...updated } : r));
  }

  // Create notifications
  addNotification(notif: Partial<AdminNotification>): void {
    const newId = this.notifications().length > 0 ? Math.max(...this.notifications().map(n => n.id)) + 1 : 1;
    const fullNotif: AdminNotification = {
      id: newId,
      titulo: notif.titulo || 'Notificación Nueva',
      mensaje: notif.mensaje || 'Contenido de la notificación.',
      tipo: notif.tipo || 'SISTEMA',
      destinatarios: notif.destinatarios || 'TODOS',
      fechaCreacion: new Date().toISOString().split('T')[0]
    };
    this.notifications.update(list => [fullNotif, ...list]);
  }

  // Simulated XML Catalog Upload file
  uploadCatalogXmlSimulation(fileName: string, total: number, errors: number): Observable<string> {
    const newId = this.xmlImports().length > 0 ? Math.max(...this.xmlImports().map(x => x.id)) + 1 : 1;
    const record: XmlImportLog = {
      id: newId,
      nombreArchivo: fileName,
      fechaImportacion: new Date().toISOString().replace('T', ' ').substring(0, 16),
      totalRegistros: total,
      registrosCorrectos: total - errors,
      registrosError: errors,
      estado: errors === total ? 'FALLIDO' : 'COMPLETADO'
    };
    this.xmlImports.update(list => [record, ...list]);
    return of(`Importación completada del archivo XML ${fileName}. Total: ${total}. Correctos: ${record.registrosCorrectos}, Errores: ${errors}.`);
  }

  // Simulated JSON/XML Catalog Export triggers
  exportCatalogSimulation(formato: 'JSON' | 'XML'): Observable<string> {
    const newId = this.exports().length > 0 ? Math.max(...this.exports().map(e => e.id)) + 1 : 1;
    const record: JsonXmlExportLog = {
      id: newId,
      formato,
      fechaExportacion: new Date().toISOString().replace('T', ' ').substring(0, 16),
      rutaArchivo: `/exports/catalogo_export_${newId}.${formato.toLowerCase()}`,
      estado: 'COMPLETADO'
    };
    this.exports.update(list => [record, ...list]);
    return of(`Exportación completada. Archivo generado en carpeta local: ${record.rutaArchivo}`);
  }

  // ==========================================
  // Excel / CSV Exporter Helper Method
  // ==========================================
  exportToCsv(data: any[], fileName: string): void {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => 
      Object.values(obj).map(val => {
        let stringVal = val === null || val === undefined ? '' : String(val);
        // Clean commas and linebreaks to prevent layout shifts in CSV
        stringVal = stringVal.replace(/"/g, '""').replace(/,/g, ';').replace(/\n/g, ' ');
        return `"${stringVal}"`;
      }).join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
