import { Injectable, signal, computed } from '@angular/core';
import { Observable, of } from 'rxjs';

// Interfaces fuertemente tipadas
export interface KpiCard {
  id: string;
  titulo: string;
  valor: string;
  icono: string;
  tendencia: string;
  tendenciaPositiva: boolean;
}

export interface TopCategory {
  nombre: string;
  ventas: number;
  pedidos: number;
  participacion: number;
}

export interface TopVendor {
  nombreTienda: string;
  region: string;
  ventas: number;
  productosCount: number;
}

export interface RecentActivity {
  hora: string;
  usuario: string;
  accion: string;
  modulo: 'AUTH' | 'PRODUCTO' | 'PEDIDO' | 'PAGO' | 'INVENTARIO' | 'SOAP' | 'KAFKA' | 'SISTEMA';
  resultado: 'OK' | 'ERROR' | 'WARN';
}

export interface CriticalAlerts {
  stockBajo: number;
  pedidosPendientes: number;
  pagosFallidos: number;
  erroresCriticos: number;
  serviciosCaidos: number;
}

export interface KafkaStatus {
  status: 'ONLINE' | 'OFFLINE';
  mensajesHoy: number;
  eventosProcesados: number;
  errores: number;
}

export interface SoapStatus {
  status: 'DISPONIBLE' | 'MANTENIMIENTO' | 'CAIDO';
  transaccionesHoy: number;
  erroresSoap: number;
  tiempoRespuesta: string;
}

export interface LogsSummary {
  info: number;
  warn: number;
  error: number;
  fatal: number;
}

export interface SystemStatus {
  cpu: number;
  ram: string;
  disco: number;
  microservicios: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  
  // 1. KPIs principales (Signals)
  readonly kpis = signal<KpiCard[]>([
    { id: '1', titulo: 'Usuarios Totales', valor: '1,250', icono: 'person', tendencia: '+12% este mes', tendenciaPositiva: true },
    { id: '2', titulo: 'Vendedores Activos', valor: '85', icono: 'storefront', tendencia: '+4 nuevos hoy', tendenciaPositiva: true },
    { id: '3', titulo: 'Productos Publicados', valor: '4,560', icono: 'inventory_2', tendencia: '+124 esta semana', tendenciaPositiva: true },
    { id: '4', titulo: 'Pedidos del Día', valor: '145', icono: 'shopping_bag', tendencia: '+18% vs ayer', tendenciaPositiva: true },
    { id: '5', titulo: 'Ventas del Día', valor: 'S/ 12,540', icono: 'payments', tendencia: '+8% vs ayer', tendenciaPositiva: true },
    { id: '6', titulo: 'Ventas del Mes', valor: 'S/ 152,800', icono: 'analytics', tendencia: '+24% vs mes anterior', tendenciaPositiva: true },
    { id: '7', titulo: 'Pagos Pendientes', valor: '12', icono: 'credit_card', tendencia: '-5 resueltos hoy', tendenciaPositiva: true },
    { id: '8', titulo: 'Conversaciones Activas', valor: '37', icono: 'chat', tendencia: '9 en espera', tendenciaPositiva: false }
  ]);

  // 2. Gráficos de Ventas y Pedidos (Signals)
  readonly salesData = signal<number[]>([10500, 11200, 9800, 12400, 13100, 11500, 12540]); // últimos 7 días
  readonly ordersData = signal<number[]>([120, 135, 110, 140, 150, 130, 145]);

  // 3. Top Categorías
  readonly topCategories = signal<TopCategory[]>([
    { nombre: 'Café', ventas: 45800, pedidos: 520, participacion: 30 },
    { nombre: 'Chocolate', ventas: 38200, pedidos: 410, participacion: 25 },
    { nombre: 'Artesanías', ventas: 30560, pedidos: 310, participacion: 20 },
    { nombre: 'Textiles', ventas: 22920, pedidos: 240, participacion: 15 },
    { nombre: 'Miel', ventas: 15280, pedidos: 170, participacion: 10 }
  ]);

  // 4. Top 10 Vendedores
  readonly topVendors = signal<TopVendor[]>([
    { nombreTienda: 'Cafetería del Centro', region: 'Cusco', ventas: 24500, productosCount: 42 },
    { nombreTienda: 'Chocolates El Ceibo', region: 'Amazonas', ventas: 21200, productosCount: 35 },
    { nombreTienda: 'Artesanías Andinas', region: 'Puno', ventas: 18400, productosCount: 88 },
    { nombreTienda: 'Cooperativa Alto Mayo', region: 'San Martín', ventas: 16900, productosCount: 22 },
    { nombreTienda: 'Miel Pura del Bosque', region: 'Lambayeque', ventas: 14200, productosCount: 15 },
    { nombreTienda: 'Textiles Huaraz', region: 'Áncash', ventas: 12500, productosCount: 54 },
    { nombreTienda: 'Café Monteverde', region: 'Cajamarca', ventas: 11800, productosCount: 19 },
    { nombreTienda: 'Orgánicos del Sur', region: 'Arequipa', ventas: 10400, productosCount: 28 },
    { nombreTienda: 'Artes del Fuego', region: 'Ayacucho', ventas: 9500, productosCount: 47 },
    { nombreTienda: 'ChocoSelva', region: 'Junín', ventas: 8700, productosCount: 12 }
  ]);

  // 5. Actividad Reciente (Logs)
  readonly recentActivities = signal<RecentActivity[]>([
    { hora: '16:45', usuario: 'admin@multimarket.com', accion: 'Exportó Catálogo XML', modulo: 'KAFKA', resultado: 'OK' },
    { hora: '16:20', usuario: 'Juan Perez (Vendedor)', accion: 'Creó Producto "Café Premium"', modulo: 'PRODUCTO', resultado: 'OK' },
    { hora: '15:55', usuario: 'Sistema SOAP', accion: 'Rechazó Pago (Fondos Insuficientes)', modulo: 'PAGO', resultado: 'WARN' },
    { hora: '15:10', usuario: 'admin@multimarket.com', accion: 'Modificó Roles de Usuario', modulo: 'AUTH', resultado: 'OK' },
    { hora: '14:40', usuario: 'vendedor@multimarket.com', accion: 'Importación XML Fallida (SKU duplicado)', modulo: 'PRODUCTO', resultado: 'ERROR' },
    { hora: '14:15', usuario: 'Maria Lopez (Comprador)', accion: 'Registró Pedido #PED-8834', modulo: 'PEDIDO', resultado: 'OK' },
    { hora: '13:50', usuario: 'Sistema Kafka', accion: 'Alerta: Stock Mínimo Producto ID 45', modulo: 'INVENTARIO', resultado: 'WARN' },
    { hora: '13:02', usuario: 'admin@multimarket.com', accion: 'Error de conexión SOAP Banco', modulo: 'SOAP', resultado: 'ERROR' }
  ]);

  // 6. Alertas Críticas
  readonly criticalAlerts = signal<CriticalAlerts>({
    stockBajo: 15,
    pedidosPendientes: 25,
    pagosFallidos: 4,
    erroresCriticos: 2,
    serviciosCaidos: 0
  });

  // 7. Estado Kafka
  readonly kafkaStatus = signal<KafkaStatus>({
    status: 'ONLINE',
    mensajesHoy: 1250,
    eventosProcesados: 1238,
    errores: 12
  });

  // 8. Estado SOAP
  readonly soapStatus = signal<SoapStatus>({
    status: 'DISPONIBLE',
    transaccionesHoy: 342,
    erroresSoap: 2,
    tiempoRespuesta: '120ms'
  });

  // 9. Estado Logs
  readonly logsSummary = signal<LogsSummary>({
    info: 1500,
    warn: 25,
    error: 15,
    fatal: 0
  });

  // 10. Estado Sistema
  readonly systemStatus = signal<SystemStatus>({
    cpu: 35,
    ram: '4.2 GB',
    disco: 62,
    microservicios: 9
  });

  constructor() {}

  // Métodos de simulación para simular disparadores e interactividad en Dashboard
  triggerXmlImport(): Observable<string> {
    // Simula la importación rápida de XML
    this.recentActivities.update(list => [
      { hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }), usuario: 'admin@multimarket.com', accion: 'XML Catálogo Importado Rápido', modulo: 'PRODUCTO', resultado: 'OK' },
      ...list
    ]);
    return of('Simulación de Importación XML ejecutada con éxito. Se dispararon 45 eventos de inventario.');
  }

  triggerExport(format: 'JSON' | 'XML'): Observable<string> {
    this.recentActivities.update(list => [
      { hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }), usuario: 'admin@multimarket.com', accion: `Catálogo Exportado a ${format}`, modulo: 'KAFKA', resultado: 'OK' },
      ...list
    ]);
    return of(`Catálogo exportado exitosamente en formato ${format}. Archivo generado en carpeta exports/`);
  }

  reloadLogs(): void {
    // Recarga simulada: altera ligeramente los valores de logs para mostrar dinamismo
    this.logsSummary.update(summary => ({
      info: summary.info + Math.floor(Math.random() * 10) + 1,
      warn: summary.warn + (Math.random() > 0.7 ? 1 : 0),
      error: summary.error,
      fatal: summary.fatal
    }));
  }
}
