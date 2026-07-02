// @vitest-environment jsdom
import '@angular/compiler';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { Subject, of } from 'rxjs';

let httpMock: any;
let authServiceMock: any;
let chatServiceMock: any;
let CustomerServiceClass: any;

vi.mock('@angular/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/core')>();
  return {
    ...original,
    inject: (token: any) => {
      if (token?.name === 'HttpClient') return httpMock;
      if (token?.name === 'AuthService') return authServiceMock;
      if (token?.name === 'ChatService') return chatServiceMock;
      return {};
    }
  };
});

describe('CustomerService grouped purchases', () => {
  beforeEach(async () => {
    httpMock = {
      post: vi.fn(),
      get: vi.fn()
    };
    authServiceMock = {
      currentUserEmail: vi.fn(() => 'comprador@multimarket.com')
    };
    chatServiceMock = {
      messageReceived$: new Subject()
    };
    ({ CustomerService: CustomerServiceClass } = await import('./customer.service'));
  });

  it('groups cart items by vendor and computes shipping per store', () => {
    const service = new CustomerServiceClass();
    service.cart.set([
      { productoId: 1, nombre: 'A', sku: 'A', precio: 100, cantidad: 1, imagen: '', vendedorId: 10, vendedorNombre: 'Tienda 1' },
      { productoId: 2, nombre: 'B', sku: 'B', precio: 60, cantidad: 1, imagen: '', vendedorId: 20, vendedorNombre: 'Tienda 2' }
    ]);

    expect(service.cartGroups().length).toBe(2);
    expect(service.cartShipping()).toBe(30);
    expect(service.cartGroups()[0].vendedorNombre).toBe('Tienda 1');
  });

  it('submits grouped purchase and stores consolidated purchase locally', async () => {
    const service = new CustomerServiceClass();
    service.cart.set([
      { productoId: 1, nombre: 'Cafe', sku: 'CAF-1', precio: 50, cantidad: 2, imagen: '', vendedorId: 10, vendedorNombre: 'Tienda 1' }
    ]);

    httpMock.post.mockReturnValue(of({
      id: 500,
      numeroCompra: 'CMP-20260621-QA01',
      fechaCompra: '2026-06-21T20:00:00',
      metodoPago: 'VISA',
      estadoGeneral: 'PAGADO',
      pedidos: [
        {
          id: 100,
          numeroPedido: 'PED-100',
          fechaPedido: '2026-06-21T20:00:00',
          vendedorId: 10,
          vendedorTienda: 'Tienda 1',
          subtotal: 100,
          impuesto: 18,
          costoEnvio: 15,
          total: 133,
          estado: 'PAGADO',
          detalles: [
            { productoId: 1, productoNombre: 'Cafe', cantidad: 2, precioUnitario: 50, subtotal: 100 }
          ]
        }
      ],
      subtotal: 100,
      impuesto: 18,
      costoEnvioTotal: 15,
      total: 133
    }));

    let result: any;
    service.submitGroupedOrder('VISA', {
      id: 1,
      nombreReferencia: 'Casa',
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'Miraflores',
      direccion: 'Av. 1',
      codigoPostal: '15000',
      referencia: '',
      predeterminada: true
    }).subscribe(value => {
      result = value;
    });

    await Promise.resolve();

    expect(httpMock.post).toHaveBeenCalledWith(expect.stringContaining('/pagos/compra-agrupada'), expect.any(Object));
    expect(result.numeroCompra).toBe('CMP-20260621-QA01');
    expect(service.purchases()[0].pedidos.length).toBe(1);
    expect(service.orders()[0].estado).toBe('PAGADO');
  });
});
