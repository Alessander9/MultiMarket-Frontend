import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SellerService, SellerPayout } from '../../../services/seller.service';

@Component({
  selector: 'app-seller-payments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payments.html',
  styleUrl: './payments.css'
})
export class SellerPayments {
  protected readonly sellerService = inject(SellerService);

  readonly selectedPayout = signal<SellerPayout | null>(null);

  openDetail(payout: SellerPayout): void {
    this.selectedPayout.set(payout);
  }

  closeDetail(): void {
    this.selectedPayout.set(null);
  }
}
