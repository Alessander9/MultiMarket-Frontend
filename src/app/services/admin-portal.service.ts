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
  estadoPago: 'APROBADO' | 'FALLIDO' | 'REEMBOLSADO' | 'PENDIENTE' | 'RECHAZADO';
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
  leida?: boolean;
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
  readonly users = signal<AdminUser[]>([]);

  readonly roles = signal<AdminRole[]>([]);

  readonly vendors = signal<AdminVendor[]>([]);

  readonly categories = signal<AdminCategory[]>([]);

  readonly products = signal<AdminProduct[]>([]);

  readonly inventoryMovements = signal<InventoryMovement[]>([]);

  readonly orders = signal<AdminOrder[]>([]);

  readonly payments = signal<AdminPayment[]>([]);

  readonly soapLogs = signal<SOAPLog[]>([]);

  readonly chats = signal<AdminChat[]>([]);

  readonly notifications = signal<AdminNotification[]>([]);

  readonly xmlImports = signal<XmlImportLog[]>([]);

  readonly exports = signal<JsonXmlExportLog[]>([]);

  // ==========================================
  // BACKEND-FED READ METHODS
  // ==========================================

  loadUsers(): Observable<AdminUser[]> {
    return this.http.get<any[]>(`${this.baseUrl}/usuarios`).pipe(
      map(users => users.map(u => ({
        id: u.id,
        correo: u.correo,
        roles: Array.isArray(u.roles) ? u.roles : [],
        estado: Boolean(u.estado),
        correoVerificado: Boolean(u.correoVerificado),
        fechaRegistro: u.fechaRegistro ?? new Date().toISOString(),
        intentosFallidos: Number(u.intentosFallidos ?? 0),
        bloqueado: Boolean(u.bloqueado)
      }))),
      tap(users => this.users.set(users))
    );
  }

  loadRoles(): Observable<AdminRole[]> {
    return this.http.get<any[]>(`${this.baseUrl}/roles`).pipe(
      map(roles => roles.map(r => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion,
        permisos: Array.isArray(r.permisos) ? r.permisos : []
      }))),
      tap(roles => this.roles.set(roles))
    );
  }

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
        fechaCreacion: notif.fechaCreacion ?? notif.fecha ?? new Date().toISOString().split('T')[0],
        leida: Boolean(notif?.leida)
      }))),
      tap(notifs => this.notifications.set(notifs))
    );
  }

  loadPayments(): Observable<AdminPayment[]> {
    return this.http.get<any[]>(`${this.baseUrl}/pagos`).pipe(
      map(payments => payments.map(p => ({
        id: p.id,
        pedidoNumero: p.pedidoNumero ?? p.numeroPedido ?? '',
        monto: Number(p.monto ?? 0),
        metodoPago: p.metodoPago,
        estadoPago: p.estadoPago === 'RECHAZADO' ? 'FALLIDO' : p.estadoPago,
        fechaPago: p.fechaPago ?? new Date().toISOString(),
        codigoOperacion: p.codigoOperacion ?? ''
      }))),
      tap(payments => this.payments.set(payments))
    );
  }

  loadSoapLogs(): Observable<SOAPLog[]> {
    return this.http.get<any[]>(`${this.baseUrl}/pagos/soap`).pipe(
      map(logs => logs.map(log => ({
        id: log.id,
        tipoOperacion: (log.estado?.includes('VALIDACION') ? 'VALIDAR_TARJETA' : 'PROCESAR_PAGO') as SOAPLog['tipoOperacion'],
        estado: (log.estado?.includes('RECHAZ') ? 'RECHAZADA' : 'EXITOSA') as SOAPLog['estado'],
        fecha: log.fecha ?? new Date().toISOString(),
        requestXml: log.requestXml ?? '',
        responseXml: log.responseXml ?? ''
      }))),
      tap(logs => this.soapLogs.set(logs))
    );
  }

  loadImportHistory(): Observable<XmlImportLog[]> {
    return this.http.get<any[]>(`${this.baseUrl}/importar`).pipe(
      map(imports => imports.map(item => ({
        id: item.id,
        nombreArchivo: item.nombreArchivo,
        fechaImportacion: item.fechaImportacion ?? new Date().toISOString(),
        totalRegistros: Number(item.totalRegistros ?? 0),
        registrosCorrectos: Number(item.registrosCorrectos ?? 0),
        registrosError: Number(item.registrosError ?? 0),
        estado: (Number(item.registrosError ?? 0) > 0 ? 'FALLIDO' : 'COMPLETADO') as XmlImportLog['estado']
      }))),
      tap(imports => this.xmlImports.set(imports))
    );
  }

  loadExportHistory(): Observable<JsonXmlExportLog[]> {
    return this.http.get<any[]>(`${this.baseUrl}/exportar`).pipe(
      map(exports => exports.map(item => ({
        id: item.id,
        formato: item.formato,
        fechaExportacion: item.fechaExportacion ?? new Date().toISOString(),
        rutaArchivo: item.rutaArchivo ?? '',
        estado: item.estado ?? 'COMPLETADO'
      }))),
      tap(exports => this.exports.set(exports))
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
  addUser(user: Partial<AdminUser> & { password?: string }): Observable<AdminUser> {
    return this.http.post<any>(`${this.baseUrl}/usuarios`, {
      correo: user.correo,
      password: user.password,
      roles: user.roles || ['COMPRADOR'],
      estado: user.estado !== undefined ? user.estado : true
    }).pipe(
      map(created => ({
        id: created.id,
        correo: created.correo,
        roles: Array.isArray(created.roles) ? created.roles : (user.roles || ['COMPRADOR']),
        estado: Boolean(created.estado),
        correoVerificado: Boolean(created.correoVerificado),
        fechaRegistro: created.fechaRegistro ?? new Date().toISOString(),
        intentosFallidos: Number(created.intentosFallidos ?? 0),
        bloqueado: Boolean(created.bloqueado)
      })),
      tap(createdUser => {
        this.users.update(list => {
          const filtered = list.filter(u => u.id !== createdUser.id && u.correo !== createdUser.correo);
          return [...filtered, createdUser].sort((a, b) => a.id - b.id);
        });
      })
    );
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
      fechaCreacion: new Date().toISOString().split('T')[0],
      leida: notif.leida ?? false
    };
    this.notifications.update(list => [fullNotif, ...list]);
  }

  markNotificationAsRead(id: number): void {
    this.http.put<void>(`${this.baseUrl}/notificaciones/${id}/leer`, null).subscribe({
      next: () => {
        this.notifications.update(list => list.map(notif => notif.id === id ? { ...notif, leida: true } : notif));
      }
    });
  }

  markAllNotificationsAsRead(): void {
    this.notifications().filter(notif => !notif.leida).forEach(notif => this.markNotificationAsRead(notif.id));
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
