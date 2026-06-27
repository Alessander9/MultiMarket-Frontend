import '@angular/compiler';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';

let sellerServiceMock: any;
let inventoryClass: any;

vi.mock('@angular/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/core')>();
  return {
    ...original,
    inject: (token: any) => {
      if (token?.name === 'SellerService') return sellerServiceMock;
      if (token?.name === 'FormBuilder') return new FormBuilder();
      return {};
    }
  };
});

describe('SellerInventory', () => {
  const mockProduct = {
    id: 101,
    nombre: 'Taladro Pro QA',
    descripcion: 'Producto de prueba',
    sku: 'QA-101',
    categoria: 'Herramientas',
    precio: 199.9,
    stock: 12,
    peso: 1.5,
    estado: 'ACTIVO',
    imagenes: ['/img/aceite-coco.jpeg']
  };

  beforeEach(async () => {
    sellerServiceMock = {
      products: signal([mockProduct]),
      inventoryMovements: signal([]),
      adjustInventory: vi.fn(() => of({ ...mockProduct, stock: 15 }))
    };
    ({ SellerInventory: inventoryClass } = await import('./inventory'));
  });

  it('filters products by search text', () => {
    const component = new inventoryClass();
    component.searchProduct.set('taladro');
    expect(component.filteredStock().length).toBe(1);
    expect(component.filteredStock()[0].sku).toBe('QA-101');
  });

  it('submits an inventory adjustment with parsed values', async () => {
    const component = new inventoryClass();
    component.initForm();
    component.activeSubTab.set('adjust');
    component.adjustmentForm.patchValue({
      productoId: '101',
      cantidad: '3',
      tipo: 'ENTRADA',
      observacion: 'Reabastecimiento QA'
    });

    component.onSubmitAdjustment();
    await Promise.resolve();

    expect(sellerServiceMock.adjustInventory).toHaveBeenCalledWith(
      101,
      3,
      'ENTRADA',
      'Reabastecimiento QA'
    );
  });
});
