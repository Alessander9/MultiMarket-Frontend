import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SellerService, SellerPaymentRecord } from '../../../services/seller.service';
import { PaginatePipe } from '../../../shared/pipes/paginate.pipe';
import { PaginationControlsComponent } from '../../../shared/pagination-controls/pagination-controls';

@Component({
  selector: 'app-seller-payments',
  standalone: true,
  imports: [CommonModule, PaginatePipe, PaginationControlsComponent],
  templateUrl: './payments.html',
  styleUrl: './payments.css'
})
export class SellerPayments {
  protected readonly sellerService = inject(SellerService);

  readonly selectedPayout = signal<SellerPaymentRecord | null>(null);
  readonly currentPage = signal(1);
  readonly pageSize = 8;

  openDetail(payout: SellerPaymentRecord): void {
    this.selectedPayout.set(payout);
  }

  closeDetail(): void {
    this.selectedPayout.set(null);
  }

  resetPage(): void {
    this.currentPage.set(1);
  }
}
