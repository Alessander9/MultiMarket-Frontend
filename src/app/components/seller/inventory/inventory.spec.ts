import '@angular/compiler';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { SellerInventory } from './inventory';
import { SellerService, SellerProduct } from '../../../services/seller.service';

describe('SellerInventory', () => {
  let fixture: ComponentFixture<SellerInventory>;
  let component: SellerInventory;

  const mockProduct: SellerProduct = {
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

  const sellerServiceMock = {
    products: signal<SellerProduct[]>([mockProduct]),
    inventoryMovements: signal([]),
    adjustInventory: vi.fn(() => of({ ...mockProduct, stock: 15 }))
  } as unknown as SellerService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SellerInventory],
      providers: [
        FormBuilder,
        { provide: SellerService, useValue: sellerServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SellerInventory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders stock, movements and adjust tabs', () => {
    const tabButtons = fixture.nativeElement.querySelectorAll('.tab-btn');
    expect(tabButtons.length).toBe(3);

    tabButtons[1].click();
    fixture.detectChanges();
    expect(component.activeSubTab()).toBe('movements');

    tabButtons[2].click();
    fixture.detectChanges();
    expect(component.activeSubTab()).toBe('adjust');
  });

  it('filters products by search text', () => {
    component.searchProduct.set('taladro');
    fixture.detectChanges();

    expect(component.filteredStock().length).toBe(1);
    expect(component.filteredStock()[0].sku).toBe('QA-101');
  });

  it('submits an inventory adjustment with parsed values', async () => {
    component.activeSubTab.set('adjust');
    component.adjustmentForm.patchValue({
      productoId: '101',
      cantidad: '3',
      tipo: 'ENTRADA',
      observacion: 'Reabastecimiento QA'
    });

    component.onSubmitAdjustment();
    await fixture.whenStable();

    expect(sellerServiceMock.adjustInventory).toHaveBeenCalledWith(
      101,
      3,
      'ENTRADA',
      'Reabastecimiento QA'
    );
    expect(component.successMessage()).toContain('Nuevo stock de Taladro Pro QA: 15');
    expect(component.activeSubTab()).toBe('stock');
  });
});
