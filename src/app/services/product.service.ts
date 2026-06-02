import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Product {
  id?: number;
  nombre: string;
  descripcion: string;
  sku: string;
  precio: number;
  stock: number;
  peso: number;
  activo?: boolean;
  categoriaId: number;
  vendedorId?: number;
  vendedorNombre?: string;
  tiendaNombre?: string;
  categoriaNombre?: string;
  imagenes?: any[];
}

export interface Category {
  id?: number;
  nombre: string;
  descripcion: string;
  activa?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private normalizeProduct(product: any): Product {
    return {
      ...product,
      precio: Number(product?.precio ?? 0),
      stock: Number(product?.stock ?? 0),
      peso: Number(product?.peso ?? 0),
      vendedorNombre: product?.vendedorNombre ?? product?.tiendaNombre,
      tiendaNombre: product?.tiendaNombre ?? product?.vendedorNombre
    };
  }

  // Categories Endpoints
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/categorias`);
  }

  getCategory(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.baseUrl}/categorias/${id}`);
  }

  createCategory(request: Category): Observable<Category> {
    return this.http.post<Category>(`${this.baseUrl}/categorias`, request);
  }

  updateCategory(id: number, request: Category): Observable<Category> {
    return this.http.put<Category>(`${this.baseUrl}/categorias/${id}`, request);
  }

  deactivateCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/categorias/${id}`);
  }

  // Products Endpoints
  getProducts(): Observable<Product[]> {
    return this.http.get<any[]>(`${this.baseUrl}/productos`).pipe(
      // Backend returns tiendaNombre; UI may still read vendedorNombre.
      // Keep both names in the normalized payload.
      map(products => products.map(product => this.normalizeProduct(product)))
    );
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<any>(`${this.baseUrl}/productos/${id}`).pipe(
      map(product => this.normalizeProduct(product))
    );
  }

  createProduct(request: any): Observable<Product> {
    return this.http.post<any>(`${this.baseUrl}/productos`, request).pipe(
      map(product => this.normalizeProduct(product))
    );
  }

  updateProduct(id: number, request: any): Observable<Product> {
    return this.http.put<any>(`${this.baseUrl}/productos/${id}`, request).pipe(
      map(product => this.normalizeProduct(product))
    );
  }

  deactivateProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/productos/${id}`);
  }

  // Advanced Search
  searchProducts(searchParams: {
    nombre?: string;
    categoriaId?: number;
    vendedorId?: number;
    minPrecio?: number;
    maxPrecio?: number;
  }): Observable<Product[]> {
    let params = new HttpParams();
    
    if (searchParams.nombre) {
      params = params.set('nombre', searchParams.nombre);
    }
    if (searchParams.categoriaId) {
      params = params.set('categoriaId', searchParams.categoriaId.toString());
    }
    if (searchParams.vendedorId) {
      params = params.set('vendedorId', searchParams.vendedorId.toString());
    }
    if (searchParams.minPrecio) {
      params = params.set('minPrecio', searchParams.minPrecio.toString());
    }
    if (searchParams.maxPrecio) {
      params = params.set('maxPrecio', searchParams.maxPrecio.toString());
    }

    return this.http.get<any[]>(`${this.baseUrl}/productos/buscar`, { params }).pipe(
      map(products => products.map(product => this.normalizeProduct(product)))
    );
  }

  // Images CRUD
  addProductImage(productId: number, url: string, principal: boolean, orden: number): Observable<any> {
    let params = new HttpParams()
      .set('url', url)
      .set('principal', principal.toString())
      .set('orden', orden.toString());
      
    return this.http.post<any>(`${this.baseUrl}/productos/${productId}/imagenes`, null, { params });
  }

  deleteProductImage(imagenId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/productos/imagenes/${imagenId}`);
  }

  // XML Import
  importCatalogXml(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.baseUrl}/importar`, formData);
  }

  // JSON/XML Export
  exportCatalog(format: 'JSON' | 'XML'): Observable<any> {
    let params = new HttpParams().set('formato', format);
    return this.http.post<any>(`${this.baseUrl}/exportar`, null, { params });
  }
}
