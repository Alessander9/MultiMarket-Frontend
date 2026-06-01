import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  vendedorNombreTienda: string;
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

  // Checkout and Order Management
  crearPedido(request: OrderRequest): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.baseUrl}/pedidos`, request);
  }

  consultarPedido(id: number): Observable<OrderResponse> {
    return this.http.get<OrderResponse>(`${this.baseUrl}/pedidos/${id}`);
  }

  listarMisPedidos(): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.baseUrl}/pedidos/mis-pedidos`);
  }

  listarPedidosTienda(): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${this.baseUrl}/pedidos/tienda`);
  }

  cancelarPedido(id: number): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.baseUrl}/pedidos/${id}/cancelar`, null);
  }

  actualizarEstadoPedido(id: number, nuevoEstado: string): Observable<OrderResponse> {
    return this.http.put<OrderResponse>(`${this.baseUrl}/pedidos/${id}/estado`, { estado: nuevoEstado });
  }

  // Payment Processing
  procesarPago(request: PaymentRequest): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.baseUrl}/pagos`, request);
  }

  consultarPago(pagoId: number): Observable<PaymentResponse> {
    return this.http.get<PaymentResponse>(`${this.baseUrl}/pagos/${pagoId}`);
  }
}
