import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CustomerService, Address, BuyerOrder } from '../../../services/customer.service';

@Component({
  selector: 'app-customer-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css'
})
export class CustomerCheckout {
  protected readonly customerService = inject(CustomerService);
  private readonly router = inject(Router);

  // Wizard Steps: 1 = Address, 2 = Review, 3 = Payment, 4 = Success
  currentStep = signal<number>(1);
  selectedAddressId = signal<number>(1);
  selectedPaymentMethod = signal<string>('STRIPE'); // Default to Stripe
  isSubmitting = signal<boolean>(false);
  createdOrder = signal<BuyerOrder | null>(null);

  // Stripe Simulation States
  stripeError = signal<string | null>(null);
  stripeSuccessState = signal<boolean>(false);

  // Address Form State
  showNewAddressForm = signal<boolean>(false);
  newAddress = {
    nombreReferencia: '',
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: '',
    direccion: '',
    codigoPostal: '',
    referencia: '',
    predeterminada: false
  };

  // Payment mock fields
  paymentDetails = {
    cardNumber: '',
    cardHolder: '',
    cardExpiry: '',
    cardCvv: '',
    yapeNumber: '',
    plinNumber: '',
    transferReceipt: ''
  };

  fillStripeTestCard(type: 'success' | 'declined' | 'expired'): void {
    this.stripeError.set(null);
    if (type === 'success') {
      this.paymentDetails.cardNumber = '4242 4242 4242 4242';
      this.paymentDetails.cardExpiry = '12/30';
      this.paymentDetails.cardCvv = '424';
      this.paymentDetails.cardHolder = 'JUAN PEREZ SOTO';
    } else if (type === 'declined') {
      this.paymentDetails.cardNumber = '4000 0000 0000 0002';
      this.paymentDetails.cardExpiry = '08/29';
      this.paymentDetails.cardCvv = '102';
      this.paymentDetails.cardHolder = 'MARIA ALVA GOMEZ';
    } else if (type === 'expired') {
      this.paymentDetails.cardNumber = '4242 4242 4242 4245';
      this.paymentDetails.cardExpiry = '01/25';
      this.paymentDetails.cardCvv = '999';
      this.paymentDetails.cardHolder = 'JOSE TORRES PAZ';
    }
  }

  ngOnInit(): void {
    // If cart is empty and we are not in success step, redirect to catalog
    if (this.customerService.cart().length === 0 && this.currentStep() !== 4) {
      this.router.navigate(['/products']);
    }

    // Set default selected address
    const defaultAddress = this.customerService.addresses().find(a => a.predeterminada);
    if (defaultAddress) {
      this.selectedAddressId.set(defaultAddress.id);
    } else if (this.customerService.addresses().length > 0) {
      this.selectedAddressId.set(this.customerService.addresses()[0].id);
    }
  }

  // Address step navigation
  selectAddress(id: number): void {
    this.selectedAddressId.set(id);
    this.showNewAddressForm.set(false);
  }

  saveNewAddress(): void {
    if (!this.newAddress.nombreReferencia || !this.newAddress.distrito || !this.newAddress.direccion) {
      alert('Por favor complete los campos obligatorios del formulario de dirección.');
      return;
    }

    this.customerService.addAddress({ ...this.newAddress }).subscribe({
      next: (addr) => {
        this.selectedAddressId.set(addr.id);
        this.showNewAddressForm.set(false);
        // Reset address form
        this.newAddress = {
          nombreReferencia: '',
          departamento: 'Lima',
          provincia: 'Lima',
          distrito: '',
          direccion: '',
          codigoPostal: '',
          referencia: '',
          predeterminada: false
        };
      }
    });
  }

  goToStep(step: number): void {
    if (step === 2) {
      // Validate address selected
      if (!this.selectedAddressId() && !this.showNewAddressForm()) {
        alert('Por favor, seleccione o ingrese una dirección de despacho.');
        return;
      }
    }
    if (step === 3) {
      // Checked step 2 reviews
    }
    this.currentStep.set(step);
  }

  getSelectedAddress(): Address | undefined {
    return this.customerService.addresses().find(a => a.id === this.selectedAddressId());
  }

  confirmPayment(): void {
    const address = this.getSelectedAddress();
    if (!address) {
      alert('Dirección de entrega inválida.');
      return;
    }

    // Validate payment inputs
    if (this.selectedPaymentMethod() === 'STRIPE' || this.selectedPaymentMethod() === 'VISA' || this.selectedPaymentMethod() === 'MASTERCARD') {
      if (!this.paymentDetails.cardNumber || !this.paymentDetails.cardHolder || !this.paymentDetails.cardCvv) {
        alert('Por favor complete los datos de su tarjeta.');
        return;
      }
    } else if (this.selectedPaymentMethod() === 'YAPE' && !this.paymentDetails.yapeNumber) {
      alert('Por favor ingrese su número de teléfono vinculado a Yape.');
      return;
    } else if (this.selectedPaymentMethod() === 'PLIN' && !this.paymentDetails.plinNumber) {
      alert('Por favor ingrese su número de teléfono vinculado a Plin.');
      return;
    }

    this.isSubmitting.set(true);
    this.stripeError.set(null);

    // Handle Stripe Simulation
    if (this.selectedPaymentMethod() === 'STRIPE') {
      const cleanCard = this.paymentDetails.cardNumber.replace(/\s+/g, '');
      
      setTimeout(() => {
        if (cleanCard === '4000000000000002') {
          // Simulate bank decline (insufficient funds)
          this.stripeError.set('Fondos insuficientes: La tarjeta de prueba ha sido rechazada por saldo insuficiente. (Stripe Error: card_declined)');
          this.isSubmitting.set(false);
        } else if (cleanCard === '4242424242424245') {
          // Simulate expired card decline
          this.stripeError.set('Tarjeta expirada: La tarjeta ingresada ha vencido o la fecha es inválida. (Stripe Error: expired_card)');
          this.isSubmitting.set(false);
        } else {
          // Simulate success authorization
          this.stripeSuccessState.set(true);
          
          setTimeout(() => {
            this.customerService.submitOrder('STRIPE', address, {
              cardNumber: this.paymentDetails.cardNumber,
              cardCvv: this.paymentDetails.cardCvv,
              cardExpiry: this.paymentDetails.cardExpiry
            }).subscribe({
              next: (order) => {
                this.createdOrder.set(order);
                this.currentStep.set(4);
                this.isSubmitting.set(false);
                this.stripeSuccessState.set(false);
              },
              error: (err) => {
                alert('Ocurrió un error al procesar el pago en base de datos. Por favor intente nuevamente.');
                this.isSubmitting.set(false);
                this.stripeSuccessState.set(false);
              }
            });
          }, 1200);
        }
      }, 2000);
    } else {
      // Standard Payment Methods
      this.customerService.submitOrder(this.selectedPaymentMethod(), address, {
        cardNumber: this.paymentDetails.cardNumber,
        cardCvv: this.paymentDetails.cardCvv,
        cardExpiry: this.paymentDetails.cardExpiry
      }).subscribe({
        next: (order) => {
          this.createdOrder.set(order);
          this.currentStep.set(4);
          this.isSubmitting.set(false);
        },
        error: (err) => {
          alert('Ocurrió un error al procesar el pago. Por favor intente nuevamente.');
          this.isSubmitting.set(false);
        }
      });
    }
  }
}
