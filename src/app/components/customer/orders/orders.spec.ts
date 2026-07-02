// @vitest-environment jsdom
import '@angular/compiler';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { of } from 'rxjs';

let customerServiceMock: any;
let OrdersClass: any;

vi.mock('@angular/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/core')>();
  return {
    ...original,
    inject: (token: any) => {
      if (token?.name === 'CustomerService') return customerServiceMock;
      return {};
    }
  };
});

describe('CustomerOrders grouped purchases', () => {
  beforeEach(async () => {
    customerServiceMock = {
      purchases: signal([
        {
          id: 500,
          numeroCompra: 'CMP-100',
          fechaCompra: '2026-06-21T20:00:00',
          metodoPago: 'VISA',
          estadoGeneral: 'PAGADO',
          pedidos: [{ id: 100, estado: 'PAGADO', vendedorNombreTienda: 'Tienda 1', numeroPedido: 'PED-100' }],
          items: [{ productoId: 1, nombre: 'Cafe', sku: 'CAF-1', precio: 50, cantidad: 2, imagen: '', vendedorId: 10, vendedorNombre: 'Tienda 1' }],
          subtotal: 100,
          impuesto: 18,
          costoEnvioTotal: 15,
          total: 133
        }
      ]),
      exportPurchasePdf: vi.fn(() => of(new Blob(['pdf'], { type: 'application/pdf' })))
    };
    ({ CustomerOrders: OrdersClass } = await import('./orders'));
  });

  it('loads active grouped purchases and selects the first one', () => {
    const component = new OrdersClass();
    component.ngOnInit();

    expect(component.getActivePurchases().length).toBe(1);
    expect(component.getSelectedPurchase()?.numeroCompra).toBe('CMP-100');
  });

  it('reacts when purchases arrive after initialization', async () => {
    customerServiceMock.purchases.set([]);
    const component = new OrdersClass();
    component.ngOnInit();

    expect(component.getSelectedPurchase()).toBeUndefined();

    customerServiceMock.purchases.set([
      {
        id: 501,
        numeroCompra: 'CMP-200',
        fechaCompra: '2026-06-21T21:00:00',
        metodoPago: 'YAPE',
        estadoGeneral: 'PAGADO',
        pedidos: [{ id: 101, estado: 'PAGADO', vendedorNombreTienda: 'Tienda 2', numeroPedido: 'PED-200' }],
        items: [{ productoId: 2, nombre: 'Miel', sku: 'M-1', precio: 30, cantidad: 1, imagen: '', vendedorId: 20, vendedorNombre: 'Tienda 2' }],
        subtotal: 30,
        impuesto: 5.4,
        costoEnvioTotal: 15,
        total: 50.4
      }
    ]);

    await Promise.resolve();

    expect(component.getSelectedPurchase()?.numeroCompra).toBe('CMP-200');
  });

  it('requests PDF export for the selected purchase', async () => {
    const component = new OrdersClass();
    const createObjectURLSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeSpy = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    component.exportReceipt(500);
    await Promise.resolve();

    expect(customerServiceMock.exportPurchasePdf).toHaveBeenCalledWith(500);
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    createObjectURLSpy.mockRestore();
    revokeSpy.mockRestore();
    clickSpy.mockRestore();
  });
});
