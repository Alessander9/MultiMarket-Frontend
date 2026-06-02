import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface OrderDetail {
  productoId: number;
  cantidad: number;
  precioUnitario?: number;
}

export interface OrderRequest {
  vendedorId: number;
  detalles: OrderDetail[];
}

export interface OrderResponse {
  id: number;
  numeroPedido: string;
  fechaPedido: string;
  subtotal: number;
  impuesto: number;
  costoEnvio: number;
  total: number;
  estado: 'PENDIENTE' | 'PAGADO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO';
  compradorCorreo: string;
  vendedorTienda?: string;
  vendedorNombreTienda?: string;
  detalles: any[];
}

export interface PaymentRequest {
  pedidoId: number;
  metodoPago: 'VISA' | 'MASTERCARD' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA';
  numeroTarjeta?: string;
  cvv?: string;
  fechaExpiracion?: string;
}

export interface PaymentResponse {
  id: number;
  monto: number;
  metodoPago: string;
  estadoPago: string;
  fechaPago: string;
  codigoOperacion: string;
  pedidoId: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private normalizeOrder(order: any): OrderResponse {
    return {
      ...order,
      subtotal: Number(order?.subtotal ?? 0),
      impuesto: Number(order?.impuesto ?? 0),
      costoEnvio: Number(order?.costoEnvio ?? 0),
      total: Number(order?.total ?? 0),
      vendedorNombreTienda: order?.vendedorNombreTienda ?? order?.vendedorTienda,
      vendedorTienda: order?.vendedorTienda ?? order?.vendedorNombreTienda
    };
  }

  // Checkout and Order Management
  crearPedido(request: OrderRequest): Observable<OrderResponse> {
    return this.http.post<any>(`${this.baseUrl}/pedidos`, request).pipe(
      map(order => this.normalizeOrder(order))
    );
  }

  consultarPedido(id: number): Observable<OrderResponse> {
    return this.http.get<any>(`${this.baseUrl}/pedidos/${id}`).pipe(
      map(order => this.normalizeOrder(order))
    );
  }

  listarMisPedidos(): Observable<OrderResponse[]> {
    return this.http.get<any[]>(`${this.baseUrl}/pedidos/mis-pedidos`).pipe(
      map(orders => orders.map(order => this.normalizeOrder(order)))
    );
  }

  listarPedidosTienda(): Observable<OrderResponse[]> {
    return this.http.get<any[]>(`${this.baseUrl}/pedidos/tienda`).pipe(
      map(orders => orders.map(order => this.normalizeOrder(order)))
    );
  }

  cancelarPedido(id: number): Observable<OrderResponse> {
    return this.http.put<any>(`${this.baseUrl}/pedidos/${id}/cancelar`, null).pipe(
      map(order => this.normalizeOrder(order))
    );
  }

  actualizarEstadoPedido(id: number, nuevoEstado: string): Observable<OrderResponse> {
    return this.http.put<any>(`${this.baseUrl}/pedidos/${id}/estado`, { estado: nuevoEstado }).pipe(
      map(order => this.normalizeOrder(order))
    );
  }

  // Payment Processing
  procesarPago(request: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.baseUrl}/pagos`, request);
  }

  consultarPago(pagoId: number): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(`${this.baseUrl}/pagos/${pagoId}`);
  }
}
