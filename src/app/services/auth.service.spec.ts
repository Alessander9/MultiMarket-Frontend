import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';

const storage: Record<string, string> = {};
let httpMock: any;

vi.mock('../../environments/environment', () => ({
  environment: { production: false, apiUrl: 'http://localhost:8080' }
}));

vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value; },
  removeItem: (key: string) => { delete storage[key]; }
});

vi.mock('@angular/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/core')>();
  return {
    ...original,
    inject: (token: any) => {
      if (token?.name === 'HttpClient') return httpMock;
      return {};
    }
  };
});

let AuthService: any;

describe('AuthService', () => {
  beforeEach(async () => {
    Object.keys(storage).forEach(key => delete storage[key]);
    httpMock = {
      post: vi.fn(),
      get: vi.fn()
    };
    ({ AuthService } = await import('./auth.service'));
  });

  it('stores session data on successful login', async () => {
    httpMock.post.mockReturnValue(of({ token: 'jwt-token', correo: 'admin@test.com', roles: ['ADMIN'] }));
    const service = new AuthService();

    const res = await new Promise<any>(resolve => service.login({ correo: 'admin@test.com', password: 'Admin123' }).subscribe(resolve));

    expect(res.token).toBe('jwt-token');
    expect(localStorage.getItem('token')).toBe('jwt-token');
    expect(localStorage.getItem('correo')).toBe('admin@test.com');
    expect(JSON.parse(localStorage.getItem('roles') || '[]')).toEqual(['ADMIN']);
    expect(service.isLoggedIn()).toBe(true);
  });

  it('clears session on logout', () => {
    const service = new AuthService();
    localStorage.setItem('token', 'x');
    localStorage.setItem('correo', 'admin@test.com');
    localStorage.setItem('roles', JSON.stringify(['ADMIN']));
    service.logout();
    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });
});
