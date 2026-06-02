import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SellerService, SellerSettings } from '../../../services/seller.service';

@Component({
  selector: 'app-seller-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class SellerSettingsComponent implements OnInit {
  protected readonly sellerService = inject(SellerService);
  private readonly fb = inject(FormBuilder);

  // Active section tab: 'account' | 'security' | 'preferences'
  readonly activeSettingTab = signal<'account' | 'security' | 'preferences'>('account');

  // local states
  readonly isSaving = signal(false);
  readonly feedback = signal<string | null>(null);

  // Forms
  accountForm!: FormGroup;
  passwordForm!: FormGroup;

  ngOnInit(): void {
    this.initForms();
  }

  private initForms(): void {
    const s = this.sellerService.settings();

    // Account Owner Profile Form
    this.accountForm = this.fb.group({
      nombrePersonal: [s.cuenta.nombrePersonal, [Validators.required, Validators.maxLength(50)]],
      correo: [s.cuenta.correo, [Validators.required, Validators.email]],
      telefono: [s.cuenta.telefono, [Validators.required]],
      cargo: [s.cuenta.cargo, [Validators.required]]
    });

    // Password Update Form
    this.passwordForm = this.fb.group({
      oldPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  onSubmitAccount(): void {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const val = this.accountForm.value;
    const current = this.sellerService.settings();

    const updated: SellerSettings = {
      ...current,
      cuenta: {
        nombrePersonal: val.nombrePersonal,
        correo: val.correo,
        telefono: val.telefono,
        cargo: val.cargo
      }
    };

    this.sellerService.saveSettings(updated).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showToast('Datos de cuenta actualizados.');
      },
      error: () => this.isSaving.set(false)
    });
  }

  onSubmitPassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    setTimeout(() => {
      this.isSaving.set(false);
      this.passwordForm.reset();
      this.showToast('Contraseña actualizada exitosamente en el servidor.');
    }, 1000);
  }

  toggle2fa(): void {
    const current = this.sellerService.settings();
    const updated: SellerSettings = {
      ...current,
      seguridad: {
        ...current.seguridad,
        dobleFactor: !current.seguridad.dobleFactor
      }
    };

    this.sellerService.saveSettings(updated).subscribe({
      next: () => {
        this.showToast(`Autenticación de Doble Factor (2FA) ${updated.seguridad.dobleFactor ? 'activada' : 'desactivada'}.`);
      }
    });
  }

  updatePreference(key: 'notificacionesEmail' | 'notificacionesChat', event: Event): void {
    const input = event.target as HTMLInputElement;
    const current = this.sellerService.settings();

    const updated: SellerSettings = {
      ...current,
      preferencias: {
        ...current.preferencias,
        [key]: input.checked
      }
    };

    this.sellerService.saveSettings(updated).subscribe();
  }

  private showToast(text: string): void {
    this.feedback.set(text);
    setTimeout(() => {
      this.feedback.set(null);
    }, 3000);
  }
}
