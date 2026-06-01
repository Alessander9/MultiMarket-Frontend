import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Form definition
  readonly loginForm: FormGroup = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false]
  });

  // State Signals
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);

  // Submits the login request to the Spring Boot backend
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formValues = this.loginForm.value;
    const loginRequest = {
      correo: formValues.correo,
      password: formValues.password
    };

    this.authService.login(loginRequest).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        // Successful login: route user based on their roles
        const roles = response.roles || [];
        if (roles.includes('ADMIN')) {
          this.router.navigate(['/admin/dashboard']);
        } else if (roles.includes('VENDEDOR')) {
          this.router.navigate(['/productos']); // Vendedors manage inventory
        } else {
          this.router.navigate(['/productos']); // Buyers browse products
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        // Display precise error messages from the backend API (e.g. account locked, unverified email)
        if (err.status === 400 || err.status === 401 || err.status === 403 || err.status === 409 || err.status === 500) {
          const detail = typeof err.error === 'string' ? err.error : (err.error?.message || 'Credenciales incorrectas');
          this.errorMessage.set(detail);
        } else {
          this.errorMessage.set('No se pudo establecer conexión con el servidor. Por favor, intente más tarde.');
        }
      }
    });
  }

  // Toggles password input type between 'password' and 'text'
  togglePasswordVisibility(): void {
    this.showPassword.update(show => !show);
  }

  // Checks validation errors for rendering CSS classes
  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
