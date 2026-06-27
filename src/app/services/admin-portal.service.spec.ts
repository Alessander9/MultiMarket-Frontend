import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';

let httpMock: any;
vi.mock('../../environments/environment', () => ({
  environment: { production: false, apiUrl: 'http://localhost:8080' }
}));

vi.mock('@angular/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/core')>();
  return {
    ...original,
    inject: (token: any) => {
      if (token?.name === 'HttpClient') return httpMock;
      return {};
    }
  };
});

let AdminPortalService: any;

describe('AdminPortalService', () => {
  beforeEach(async () => {
    httpMock = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
    ({ AdminPortalService } = await import('./admin-portal.service'));
  });

  it('normalizes vendor payload when loading', async () => {
    httpMock.get.mockReturnValue(of([{
      id: 1,
      nombreTienda: 'Tienda QA',
      descripcion: 'Demo',
      region: 'Lima',
      direccion: 'Av QA 123',
      logo: 'logo.png',
      banner: 'banner.png',
      activo: true,
      fechaCreacion: '2026-06-20T10:00:00'
    }]));
    const service = new AdminPortalService();
    const vendors = await new Promise<any>(resolve => service.loadVendors().subscribe(resolve));
    expect(vendors[0].fechaCreacion).toBe('2026-06-20');
    expect(service.vendors()[0].nombreTienda).toBe('Tienda QA');
  });

  it('builds deleteVendor request with activo=false', async () => {
    httpMock.put.mockReturnValue(of({ id: 5, activo: false }));
    const service = new AdminPortalService();
    await new Promise<void>(resolve => service.deleteVendor(5).subscribe(() => resolve()));
    expect(httpMock.put).toHaveBeenCalled();
    const [, , options] = httpMock.put.mock.calls[0];
    expect(options.params.toString()).toContain('activo=false');
  });

  it('maps product images safely', async () => {
    httpMock.get.mockReturnValue(of([{
      id: 10,
      nombre: 'Producto QA',
      descripcion: 'Demo',
      sku: 'SKU-1',
      precio: '19.99',
      stock: '5',
      peso: '1.2',
      imagenes: [{ url: 'img1.png' }, 'img2.png']
    }]));
    const service = new AdminPortalService();
    const products = await new Promise<any>(resolve => service.loadProducts().subscribe(resolve));
    expect(products[0].precio).toBe(19.99);
    expect(products[0].imagenes).toEqual(['img1.png', 'img2.png']);
  });

  it('updates vendor cache after updateVendor', async () => {
    httpMock.put.mockReturnValue(of({
      id: 5,
      nombreTienda: 'Tienda Editada',
      descripcion: 'Nueva',
      region: 'Lima',
      direccion: 'Av 1',
      logo: 'logo.png',
      banner: 'banner.png',
      activo: true,
      fechaCreacion: '2026-06-20T00:00:00',
      calificacionPromedio: 4.8
    }));
    const service = new AdminPortalService();
    service.vendors.set([{ id: 5, nombreTienda: 'Vieja', descripcion: '', region: '', direccion: '', logo: '', banner: '', activo: true, fechaCreacion: '2026-06-20', calificacionPromedio: 5 }]);

    const updated = await new Promise<any>(resolve => service.updateVendor(5, { nombreTienda: 'Tienda Editada' }).subscribe(resolve));
    expect(updated.nombreTienda).toBe('Tienda Editada');
    expect(service.vendors()[0].nombreTienda).toBe('Tienda Editada');
  });

  it('removes product from cache after deleteProduct', async () => {
    httpMock.delete.mockReturnValue(of(void 0));
    const service = new AdminPortalService();
    service.products.set([{ id: 9, nombre: 'Prod', descripcion: '', sku: 'SKU', categoriaId: 1, vendedorId: 1, precio: 10, stock: 1, peso: 1, activo: true, fechaCreacion: '2026-06-20', imagenes: [] }]);

    await new Promise<void>(resolve => service.deleteProduct(9).subscribe(() => resolve()));
    expect(service.products().length).toBe(0);
  });

  it('updates product cache after updateProduct', async () => {
    httpMock.put.mockReturnValue(of({
      id: 9,
      nombre: 'Prod Editado',
      descripcion: '',
      sku: 'SKU-EDIT',
      categoriaId: 1,
      vendedorId: 1,
      precio: 30,
      stock: 2,
      peso: 1,
      activo: true,
      fechaCreacion: '2026-06-20',
      imagenes: []
    }));
    const service = new AdminPortalService();
    service.products.set([{ id: 9, nombre: 'Prod', descripcion: '', sku: 'SKU', categoriaId: 1, vendedorId: 1, precio: 10, stock: 1, peso: 1, activo: true, fechaCreacion: '2026-06-20', imagenes: [] }]);

    const updated = await new Promise<any>(resolve => service.updateProduct(9, { nombre: 'Prod Editado' }).subscribe(resolve));
    expect(updated.sku).toBe('SKU-EDIT');
    expect(service.products()[0].nombre).toBe('Prod Editado');
  });
});
