import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const sellerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    const roles = authService.currentUserRoles();
    if (roles.includes('VENDEDOR') || roles.includes('ADMIN')) {
      return true;
    }
  }

  // Unauthorized: redirect to login
  router.navigate(['/login']);
  return false;
};
