import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SellerService, SellerProduct, InventoryMovement } from '../../../services/seller.service';

@Component({
  selector: 'app-seller-inventory',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css'
})
export class SellerInventory implements OnInit {
  protected readonly sellerService = inject(SellerService);
  private readonly fb = inject(FormBuilder);

  // local active sub-section: 'stock' | 'movements' | 'adjust'
  readonly activeSubTab = signal<'stock' | 'movements' | 'adjust'>('stock');

  // UI status
  readonly isLoading = signal(false);
  readonly successMessage = signal<string | null>(null);

  // Search filter
  readonly searchProduct = signal('');
  readonly filterMvtType = signal('ALL');

  // Form Group
  adjustmentForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
  }

  public initForm(): void {
    this.adjustmentForm = this.fb.group({
      productoId: ['', [Validators.required]],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      tipo: ['ENTRADA', [Validators.required]],
      observacion: ['', [Validators.required, Validators.maxLength(250)]]
    });
  }

  // --- STATS / COMPUTED ---

  readonly filteredStock = computed(() => {
    let prods = this.sellerService.products();
    const q = this.searchProduct().trim().toLowerCase();
    if (q) {
      prods = prods.filter(p => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    return prods;
  });

  readonly filteredMovements = computed(() => {
    let mvts = this.sellerService.inventoryMovements();
    const type = this.filterMvtType();
    if (type !== 'ALL') {
      mvts = mvts.filter(m => m.tipo === type);
    }
    return mvts;
  });

  // --- SUBMISSIONS ---

  onSubmitAdjustment(): void {
    if (this.adjustmentForm.invalid) {
      this.adjustmentForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.successMessage.set(null);

    const values = this.adjustmentForm.value;
    const prodId = parseInt(values.productoId, 10);
    const qty = parseInt(values.cantidad, 10);

    this.sellerService.adjustInventory(prodId, qty, values.tipo, values.observacion).subscribe({
      next: (updatedProd) => {
        this.isLoading.set(false);
        this.successMessage.set(`Inventario ajustado con éxito. Nuevo stock de ${updatedProd.nombre}: ${updatedProd.stock} unidades.`);
        this.adjustmentForm.reset({ productoId: '', cantidad: 1, tipo: 'ENTRADA', observacion: '' });
        this.activeSubTab.set('stock');

        setTimeout(() => {
          this.successMessage.set(null);
        }, 4000);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }
}
