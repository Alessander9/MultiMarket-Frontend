import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';

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
    { id: 3, nombreTienda: 'Artesanías Andinas', descripcion: 'Textiles, cerámicas y platería hechos a mano.', region: 'Puno', direccion: 'Av. Floral 890', logo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=100', banner: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600', activo: true, fechaCreacion: '2026-05-15', calificacionPromedio: 4.5 }
  ]);

  readonly categories = signal<AdminCategory[]>([
    { id: 1, nombre: 'Café', descripcion: 'Granos de café regionales y mezclas de altura.', activa: true },
    { id: 2, nombre: 'Chocolate', descripcion: 'Barras de chocolate, bombones y cacao en polvo.', activa: true },
    { id: 3, nombre: 'Artesanías', descripcion: 'Cerámicas, platería, retablos y manualidades tradicionales.', activa: true },
    { id: 4, nombre: 'Textiles', descripcion: 'Mantados, chalinas, chompas de alpaca y prendas típicas.', activa: true },
    { id: 5, nombre: 'Miel', descripcion: 'Miel de abeja pura y derivados apícolas.', activa: true }
  ]);

  readonly products = signal<AdminProduct[]>([
    { id: 1, nombre: 'Café Cusco Premium', descripcion: 'Café de altura 100% orgánico de grano seleccionado.', sku: 'CAF-CUS-001', categoriaId: 1, vendedorId: 1, precio: 35.00, stock: 45, peso: 0.50, activo: true, fechaCreacion: '2026-05-02', imagenes: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300'] },
    { id: 2, nombre: 'Chocolate Amargo 70%', descripcion: 'Chocolate de origen fino de aroma con notas de frutos secos.', sku: 'CHO-AMA-070', categoriaId: 2, vendedorId: 2, precio: 12.50, stock: 120, peso: 0.10, activo: true, fechaCreacion: '2026-05-13', imagenes: ['https://images.unsplash.com/photo-1548907040-4d42b52125e0?w=300'] },
    { id: 3, nombre: 'Retablo Ayacuchano Mediano', descripcion: 'Escena tradicional andina tallada a mano en madera y pasta.', sku: 'ART-RET-AY2', categoriaId: 3, vendedorId: 3, precio: 85.00, stock: 8, peso: 1.20, activo: true, fechaCreacion: '2026-05-16', imagenes: ['https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300'] },
    { id: 4, nombre: 'Chalina de Alpaca Baby', descripcion: 'Chalina tejida con pura alpaca suave y abrigadora.', sku: 'TEX-CHA-ALP', categoriaId: 4, vendedorId: 3, precio: 120.00, stock: 3, peso: 0.25, activo: true, fechaCreacion: '2026-05-18', imagenes: ['https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=300'] },
    { id: 5, nombre: 'Miel de Abeja Silvestre', descripcion: 'Miel cosechada en bosques del norte totalmente cruda.', sku: 'MIE-SIL-001', categoriaId: 5, vendedorId: 1, precio: 22.00, stock: 50, peso: 0.60, activo: true, fechaCreacion: '2026-05-20', imagenes: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300'] }
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
  addVendor(vendor: Partial<AdminVendor>): void {
    const newId = this.vendors().length > 0 ? Math.max(...this.vendors().map(v => v.id)) + 1 : 1;
    const fullVendor: AdminVendor = {
      id: newId,
      nombreTienda: vendor.nombreTienda || 'Tienda Nueva',
      descripcion: vendor.descripcion || 'Sin descripción',
      region: vendor.region || 'Lima',
      direccion: vendor.direccion || 'Calle Sin Nombre 123',
      logo: vendor.logo || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=100',
      banner: vendor.banner || 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600',
      activo: vendor.activo !== undefined ? vendor.activo : true,
      fechaCreacion: new Date().toISOString().split('T')[0],
      calificacionPromedio: 5.0
    };
    this.vendors.update(list => [...list, fullVendor]);
  }

  updateVendor(id: number, updated: Partial<AdminVendor>): void {
    this.vendors.update(list => list.map(v => v.id === id ? { ...v, ...updated } : v));
  }

  deleteVendor(id: number): void {
    this.vendors.update(list => list.filter(v => v.id !== id));
  }

  // Categories CRUD
  addCategory(cat: Partial<AdminCategory>): void {
    const newId = this.categories().length > 0 ? Math.max(...this.categories().map(c => c.id)) + 1 : 1;
    const fullCat: AdminCategory = {
      id: newId,
      nombre: cat.nombre || 'Categoría Nueva',
      descripcion: cat.descripcion || 'Sin descripción',
      activa: cat.activa !== undefined ? cat.activa : true
    };
    this.categories.update(list => [...list, fullCat]);
  }

  updateCategory(id: number, updated: Partial<AdminCategory>): void {
    this.categories.update(list => list.map(c => c.id === id ? { ...c, ...updated } : c));
  }

  deleteCategory(id: number): void {
    this.categories.update(list => list.filter(c => c.id !== id));
  }

  // Products CRUD
  addProduct(prod: Partial<AdminProduct>): void {
    const newId = this.products().length > 0 ? Math.max(...this.products().map(p => p.id)) + 1 : 1;
    const fullProd: AdminProduct = {
      id: newId,
      nombre: prod.nombre || 'Producto Nuevo',
      descripcion: prod.descripcion || 'Sin descripción',
      sku: prod.sku || 'SKU-NUEVO-' + newId,
      categoriaId: prod.categoriaId || 1,
      vendedorId: prod.vendedorId || 1,
      precio: prod.precio || 10.00,
      stock: prod.stock || 10,
      peso: prod.peso || 0.10,
      activo: prod.activo !== undefined ? prod.activo : true,
      fechaCreacion: new Date().toISOString().split('T')[0],
      imagenes: prod.imagenes && prod.imagenes.length > 0 ? prod.imagenes : ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300']
    };
    this.products.update(list => [...list, fullProd]);

    // Registrar ingreso inicial en movimientos de inventario
    this.addInventoryMovement(fullProd.id, fullProd.nombre, fullProd.stock, 'ENTRADA', 'Ingreso inicial al crear producto.');
  }

  updateProduct(id: number, updated: Partial<AdminProduct>): void {
    this.products.update(list => list.map(p => p.id === id ? { ...p, ...updated } : p));
  }

  deleteProduct(id: number): void {
    this.products.update(list => list.filter(p => p.id !== id));
  }

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
    this.updateProduct(productoId, { stock: nuevoStock });
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
