import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SellerService } from '../../../services/seller.service';

@Component({
  selector: 'app-seller-sales',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sales.html',
  styleUrl: './sales.css'
})
export class SellerSales implements OnInit {
  protected readonly sellerService = inject(SellerService);

  readonly isLoading = signal(false);

  ngOnInit(): void {
    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
    }, 300);
  }
}
