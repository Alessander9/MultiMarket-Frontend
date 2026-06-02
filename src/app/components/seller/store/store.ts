import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SellerService, StoreProfile } from '../../../services/seller.service';

@Component({
  selector: 'app-seller-store',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './store.html',
  styleUrl: './store.css'
})
export class SellerStore implements OnInit {
  protected readonly sellerService = inject(SellerService);
  private readonly fb = inject(FormBuilder);

  // Active Screen Section Signal: 'view' | 'edit' | 'stats'
  readonly activeTab = signal<'view' | 'edit' | 'stats'>('view');
  
  // UI Actions States
  readonly isSaving = signal(false);
  readonly successMessage = signal<string | null>(null);

  // Reactive Form
  storeForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    const profile = this.sellerService.storeProfile();
    this.storeForm = this.fb.group({
      nombre: [profile.nombre, [Validators.required, Validators.maxLength(50)]],
      descripcion: [profile.descripcion, [Validators.required, Validators.maxLength(500)]],
      region: [profile.region, [Validators.required]],
      direccion: [profile.direccion, [Validators.required]],
      logo: [profile.logo, [Validators.required]],
      banner: [profile.banner, [Validators.required]],
      correo: [profile.correo, [Validators.required, Validators.email]],
      telefono: [profile.telefono, [Validators.required]],
      facebook: [profile.redesSociales.facebook || ''],
      instagram: [profile.redesSociales.instagram || ''],
      website: [profile.redesSociales.website || '']
    });
  }

  onSubmit(): void {
    if (this.storeForm.invalid) {
      this.storeForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.successMessage.set(null);

    const values = this.storeForm.value;
    const updatedProfile: StoreProfile = {
      nombre: values.nombre,
      descripcion: values.descripcion,
      region: values.region,
      direccion: values.direccion,
      logo: values.logo,
      banner: values.banner,
      correo: values.correo,
      telefono: values.telefono,
      redesSociales: {
        facebook: values.facebook,
        instagram: values.instagram,
        website: values.website
      }
    };

    this.sellerService.updateStoreProfile(updatedProfile).subscribe({
      next: (profile) => {
        this.isSaving.set(false);
        this.successMessage.set('Perfil de tienda actualizado con éxito.');
        this.activeTab.set('view');
        
        // Auto fade toast
        setTimeout(() => {
          this.successMessage.set(null);
        }, 3000);
      },
      error: () => {
        this.isSaving.set(false);
      }
    });
  }

  resetForm(): void {
    this.initForm();
    this.activeTab.set('view');
  }
}
