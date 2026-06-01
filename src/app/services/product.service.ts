import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.get<Product[]>(`${this.baseUrl}/productos`);
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/productos/${id}`);
  }

  createProduct(request: any): Observable<Product> {
    return this.http.post<Product>(`${this.baseUrl}/productos`, request);
  }

  updateProduct(id: number, request: any): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/productos/${id}`, request);
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

    return this.http.get<Product[]>(`${this.baseUrl}/productos/buscar`, { params });
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
