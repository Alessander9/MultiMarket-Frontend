import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService, Address, BuyerProfile } from '../../../services/customer.service';

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class CustomerProfile {
  protected readonly customerService = inject(CustomerService);

  // Active sub-tab settings: 'personal' | 'addresses' | 'security' | 'preferences'
  activeTab = signal<'personal' | 'addresses' | 'security' | 'preferences'>('personal');

  // Address edit state
  editingAddressId = signal<number | null>(null);
  showAddressForm = signal<boolean>(false);
  addressFormModel: Address = this.getEmptyAddressModel();

  // Security Form State
  passwordForm = {
    current: '',
    new: '',
    confirm: ''
  };

  // Profile Form state
  profileForm: BuyerProfile = { nombres: '', apellidos: '', correo: '', telefono: '', foto: '' };

  // Preferences Form state
  prefForm = { idioma: 'es', zonaHoraria: 'America/Lima (UTC-5)', notificacionesEmail: true, notificacionesPush: true, tema: 'dark' };

  // Mock Active Sessions
  activeSessions = [
    { device: 'Windows PC • Google Chrome', location: 'Lima, Perú', isCurrent: true, lastActive: 'Ahora mismo' },
    { device: 'iPhone 15 • Safari App', location: 'Cusco, Perú', isCurrent: false, lastActive: 'Hace 3 horas' }
  ];

  ngOnInit(): void {
    // Sync local form states with reactive signal states
    this.profileForm = { ...this.customerService.profile() };
    this.prefForm = { ...this.customerService.preferences() };
  }

  // Toggle profile tabs
  selectTab(tab: 'personal' | 'addresses' | 'security' | 'preferences'): void {
    this.activeTab.set(tab);
    this.showAddressForm.set(false);
    this.editingAddressId.set(null);
  }

  // --- PROFILE LOGICS ---
  saveProfile(): void {
    if (!this.profileForm.nombres || !this.profileForm.apellidos || !this.profileForm.correo) {
      alert('Los campos Nombres, Apellidos y Correo son obligatorios.');
      return;
    }

    this.customerService.updateProfile(this.profileForm).subscribe({
      next: (updated) => {
        alert('¡Datos personales actualizados correctamente!');
      }
    });
  }

  // --- ADDRESS LOGICS ---
  getEmptyAddressModel(): Address {
    return {
      id: 0,
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

  openNewAddressForm(): void {
    this.addressFormModel = this.getEmptyAddressModel();
    this.editingAddressId.set(null);
    this.showAddressForm.set(true);
  }

  openEditAddressForm(addr: Address): void {
    this.addressFormModel = { ...addr };
    this.editingAddressId.set(addr.id);
    this.showAddressForm.set(true);
  }

  saveAddress(): void {
    const model = this.addressFormModel;
    if (!model.nombreReferencia || !model.distrito || !model.direccion) {
      alert('Por favor complete los campos obligatorios (*).');
      return;
    }

    if (this.editingAddressId()) {
      // Edit
      this.customerService.updateAddress(this.editingAddressId()!, model).subscribe({
        next: () => {
          this.showAddressForm.set(false);
          this.editingAddressId.set(null);
        }
      });
    } else {
      // Create new
      this.customerService.addAddress(model).subscribe({
        next: () => {
          this.showAddressForm.set(false);
        }
      });
    }
  }

  deleteAddress(id: number, event: Event): void {
    event.stopPropagation();
    if (confirm('¿Está seguro de que desea eliminar esta dirección?')) {
      this.customerService.deleteAddress(id).subscribe();
    }
  }

  // --- SECURITY LOGICS ---
  changePassword(): void {
    if (!this.passwordForm.current || !this.passwordForm.new || !this.passwordForm.confirm) {
      alert('Por favor, rellene todos los campos.');
      return;
    }

    if (this.passwordForm.new !== this.passwordForm.confirm) {
      alert('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    alert('¡Contraseña cambiada exitosamente!');
    this.passwordForm = { current: '', new: '', confirm: '' };
  }

  revokeSession(device: string): void {
    alert(`Se ha revocado la sesión en el dispositivo: ${device}`);
    this.activeSessions = this.activeSessions.filter(s => s.device !== device);
  }

  // --- PREFERENCES LOGICS ---
  savePreferences(): void {
    this.customerService.updatePreferences(this.prefForm).subscribe({
      next: () => {
        alert('¡Preferencias guardadas con éxito!');
      }
    });
  }
}
