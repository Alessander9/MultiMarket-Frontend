import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const buyerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const roles = authService.currentUserRoles();

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  if (roles.includes('COMPRADOR')) {
    return true;
  }

  if (roles.includes('VENDEDOR')) {
    return router.createUrlTree(['/seller/dashboard']);
  }

  if (roles.includes('ADMIN')) {
    return router.createUrlTree(['/admin/dashboard']);
  }

  return router.createUrlTree(['/']);
};
