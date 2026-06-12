import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, map } from 'rxjs';
import { environment } from '../../environments/environment';

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
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  
  // 1. KPIs principales (Signals)
  readonly kpis = signal<KpiCard[]>([]);

  // 2. Gráficos de Ventas y Pedidos (Signals)
  readonly salesData = signal<number[]>([]);
  readonly ordersData = signal<number[]>([]);

  // 3. Top Categorías
  readonly topCategories = signal<TopCategory[]>([]);

  // 4. Top 10 Vendedores
  readonly topVendors = signal<TopVendor[]>([]);

  // 5. Actividad Reciente (Logs)
  readonly recentActivities = signal<RecentActivity[]>([]);

  // 6. Alertas Críticas
  readonly criticalAlerts = signal<CriticalAlerts>({
    stockBajo: 0,
    pedidosPendientes: 0,
    pagosFallidos: 0,
    erroresCriticos: 0,
    serviciosCaidos: 0
  });

  // 7. Estado Kafka
  readonly kafkaStatus = signal<KafkaStatus>({
    status: 'OFFLINE',
    mensajesHoy: 0,
    eventosProcesados: 0,
    errores: 0
  });

  // 8. Estado SOAP
  readonly soapStatus = signal<SoapStatus>({
    status: 'MANTENIMIENTO',
    transaccionesHoy: 0,
    erroresSoap: 0,
    tiempoRespuesta: 'N/D'
  });

  // 9. Estado Logs
  readonly logsSummary = signal<LogsSummary>({
    info: 0,
    warn: 0,
    error: 0,
    fatal: 0
  });

  // 10. Estado Sistema
  readonly systemStatus = signal<SystemStatus>({
    cpu: 0,
    ram: '0.0 GB',
    disco: 0,
    microservicios: 1
  });

  constructor() {}

  loadSummary(): Observable<void> {
    return this.http.get<any>(`${this.baseUrl}/dashboard/admin`).pipe(
      tap(summary => {
        this.kpis.set(summary.kpis ?? []);
        this.salesData.set(summary.salesData ?? []);
        this.ordersData.set(summary.ordersData ?? []);
        this.topCategories.set(summary.topCategories ?? []);
        this.topVendors.set(summary.topVendors ?? []);
        this.recentActivities.set(summary.recentActivities ?? []);
        this.criticalAlerts.set(summary.criticalAlerts ?? this.criticalAlerts());
        this.kafkaStatus.set(summary.kafkaStatus ?? this.kafkaStatus());
        this.soapStatus.set(summary.soapStatus ?? this.soapStatus());
        this.logsSummary.set(summary.logsSummary ?? this.logsSummary());
        this.systemStatus.set(summary.systemStatus ?? this.systemStatus());
      }),
      map(() => void 0)
    );
  }

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
