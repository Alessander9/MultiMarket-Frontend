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
});
