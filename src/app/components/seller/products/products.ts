import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SellerService, SellerProduct } from '../../../services/seller.service';

@Component({
  selector: 'app-seller-products',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './products.html',
  styleUrl: './products.css'
})
export class SellerProducts implements OnInit {
  protected readonly sellerService = inject(SellerService);
  private readonly fb = inject(FormBuilder);

  // Active view state: 'list' | 'create' | 'edit' | 'detail'
  readonly viewState = signal<'list' | 'create' | 'edit' | 'detail'>('list');
  readonly selectedProduct = signal<SellerProduct | null>(null);

  // States
  readonly isLoading = signal(false);
  readonly feedbackMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filter and pagination States
  readonly filterSearch = signal('');
  readonly filterCategory = signal('ALL');
  readonly filterStatus = signal('ALL');
  readonly filterMinPrice = signal<number | null>(null);
  readonly filterMaxPrice = signal<number | null>(null);

  readonly sortBy = signal<string>('nombre');
  readonly sortAsc = signal<boolean>(true);

  readonly currentPage = signal(1);
  readonly pageSize = 5;

  // Reactive Form
  productForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
  }

  initForm(product?: SellerProduct): void {
    this.productForm = this.fb.group({
      nombre: [product?.nombre || '', [Validators.required, Validators.maxLength(100)]],
      descripcion: [product?.descripcion || '', [Validators.required, Validators.maxLength(800)]],
      sku: [product?.sku || '', [Validators.required, Validators.pattern(/^[A-Z0-9_-]+$/)]],
      categoria: [product?.categoria || 'Café', [Validators.required]],
      precio: [product?.precio || 0, [Validators.required, Validators.min(0.1)]],
      stock: [product?.stock || 0, [Validators.required, Validators.min(0)]],
      peso: [product?.peso || 0, [Validators.required, Validators.min(0.01)]],
      estado: [product?.estado || 'ACTIVO', [Validators.required]],
      imagenUrl: ['']
    });
  }

  // --- FILTERS & COMPUTED PROPERTIES ---

  readonly filteredProducts = computed(() => {
    let prods = this.sellerService.products();

    // 1. Search Query
    const search = this.filterSearch().trim().toLowerCase();
    if (search) {
      prods = prods.filter(p => 
        p.nombre.toLowerCase().includes(search) || 
        p.sku.toLowerCase().includes(search) || 
        p.descripcion.toLowerCase().includes(search)
      );
    }

    // 2. Category Filter
    const cat = this.filterCategory();
    if (cat !== 'ALL') {
      prods = prods.filter(p => p.categoria === cat);
    }

    // 3. Status Filter
    const status = this.filterStatus();
    if (status !== 'ALL') {
      prods = prods.filter(p => p.estado === status);
    }

    // 4. Price Limits
    const minP = this.filterMinPrice();
    if (minP !== null) {
      prods = prods.filter(p => p.precio >= minP);
    }
    const maxP = this.filterMaxPrice();
    if (maxP !== null) {
      prods = prods.filter(p => p.precio <= maxP);
    }

    // 5. Sorting
    const field = this.sortBy();
    const asc = this.sortAsc();
    prods = [...prods].sort((a: any, b: any) => {
      const aVal = a[field];
      const bVal = b[field];
      if (typeof aVal === 'string') {
        return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return asc ? aVal - bVal : bVal - aVal;
    });

    return prods;
  });

  // Paged slice
  readonly pagedProducts = computed(() => {
    const list = this.filteredProducts();
    const start = (this.currentPage() - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredProducts().length / this.pageSize) || 1;
  });

  // Categories list
  readonly categories = computed(() => {
    const list = this.sellerService.products().map(p => p.categoria);
    return Array.from(new Set(list));
  });

  // --- ACTIONS ---

  changePage(dir: number): void {
    const next = this.currentPage() + dir;
    if (next >= 1 && next <= this.totalPages()) {
      this.currentPage.set(next);
    }
  }

  toggleSort(field: string): void {
    if (this.sortBy() === field) {
      this.sortAsc.update(val => !val);
    } else {
      this.sortBy.set(field);
      this.sortAsc.set(true);
    }
  }

  openCreate(): void {
    this.initForm();
    this.viewState.set('create');
  }

  openEdit(product: SellerProduct): void {
    this.selectedProduct.set(product);
    this.initForm(product);
    this.viewState.set('edit');
  }

  openDetail(product: SellerProduct): void {
    this.selectedProduct.set(product);
    this.viewState.set('detail');
  }

  closeToDetails(): void {
    this.selectedProduct.set(null);
    this.viewState.set('list');
  }

  onSubmit(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.feedbackMessage.set(null);

    const values = this.productForm.value;
    const prodData = {
      nombre: values.nombre,
      descripcion: values.descripcion,
      sku: values.sku.toUpperCase(),
      categoria: values.categoria,
      precio: parseFloat(values.precio),
      stock: parseInt(values.stock, 10),
      peso: parseFloat(values.peso),
      estado: values.estado,
      imagenes: values.imagenUrl ? [values.imagenUrl] : []
    };

    if (this.viewState() === 'create') {
      this.sellerService.createProduct(prodData).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.showFeedback('Producto creado exitosamente.', 'success');
          this.viewState.set('list');
        },
        error: (err) => {
          this.isLoading.set(false);
          this.showFeedback(err.message || 'Error al crear producto.', 'error');
        }
      });
    } else { // edit
      const id = this.selectedProduct()?.id;
      if (id) {
        this.sellerService.updateProduct(id, prodData).subscribe({
          next: () => {
            this.isLoading.set(false);
            this.showFeedback('Producto actualizado exitosamente.', 'success');
            this.viewState.set('list');
          },
          error: (err) => {
            this.isLoading.set(false);
            this.showFeedback(err.message || 'Error al actualizar producto.', 'error');
          }
        });
      }
    }
  }

  deleteProduct(id: number, event: Event): void {
    event.stopPropagation();
    if (confirm('¿Está seguro de que desea eliminar este producto del catálogo?')) {
      this.isLoading.set(true);
      this.sellerService.deleteProduct(id).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.showFeedback('Producto eliminado con éxito.', 'success');
          this.currentPage.set(1);
        },
        error: () => {
          this.isLoading.set(false);
          this.showFeedback('No se pudo eliminar el producto.', 'error');
        }
      });
    }
  }

  private showFeedback(text: string, type: 'success' | 'error'): void {
    this.feedbackMessage.set({ text, type });
    setTimeout(() => {
      this.feedbackMessage.set(null);
    }, 3000);
  }

  clearFilters(): void {
    this.filterSearch.set('');
    this.filterCategory.set('ALL');
    this.filterStatus.set('ALL');
    this.filterMinPrice.set(null);
    this.filterMaxPrice.set(null);
    this.currentPage.set(1);
  }
}
