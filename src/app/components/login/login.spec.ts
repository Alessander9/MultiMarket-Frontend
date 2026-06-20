import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { FormBuilder } from '@angular/forms';

let routerMock: any;
let authMock: any;
let Login: any;

vi.mock('@angular/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/core')>();
  return {
    ...original,
    inject: (token: any) => {
      if (token?.name === 'FormBuilder') return new FormBuilder();
      if (token?.name === 'AuthService') return authMock;
      if (token?.name === 'Router') return routerMock;
      return {};
    }
  };
});

vi.mock('../../services/auth.service', () => ({
  AuthService: class AuthService {}
}));

describe('Login', () => {
  beforeEach(async () => {
    routerMock = { navigate: vi.fn() };
    authMock = { login: vi.fn(), logout: vi.fn() };
    ({ Login } = await import('./login'));
  });

  it('blocks invalid form submission', () => {
    const component = new Login();
    component.onSubmit();
    expect(authMock.login).not.toHaveBeenCalled();
  });

  it('redirects admins after successful login', () => {
    authMock.login.mockReturnValue(of({ token: 't', roles: ['ADMIN'] }));
    const component = new Login();
    component.loginForm.patchValue({ correo: 'admin@test.com', password: 'Admin123' });
    component.onSubmit();
    expect(authMock.login).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('shows backend error message on failed login', () => {
    authMock.login.mockReturnValue(throwError(() => ({ status: 401, error: { message: 'Credenciales incorrectas' } })));
    const component = new Login();
    component.loginForm.patchValue({ correo: 'bad@test.com', password: 'Wrong123' });
    component.onSubmit();
    expect(component.errorMessage()).toContain('Credenciales incorrectas');
  });

  it('fills quick access credentials', () => {
    authMock.login.mockReturnValue(of({ token: 't', roles: ['ADMIN'] }));
    const component = new Login();
    const account = component.quickAccessAccounts[0];
    component.useQuickLogin(account);
    expect(component.loginForm.value.correo).toBe(account.correo);
    expect(component.loginForm.value.password).toBe(account.password);
  });
});
