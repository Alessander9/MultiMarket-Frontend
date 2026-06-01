import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserSession {
  correo: string;
  roles: string[];
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // Signals for reactive session management
  readonly session = signal<UserSession | null>(this.loadSessionFromStorage());
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly currentUserEmail = computed(() => this.session()?.correo ?? null);
  readonly currentUserRoles = computed(() => this.session()?.roles ?? []);

  constructor() {}

  register(request: any): Observable<string> {
    return this.http.post(`${this.apiUrl}/register`, request, { responseType: 'text' });
  }

  login(request: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, request).pipe(
      tap(res => {
        if (res.token) {
          const userSession: UserSession = {
            correo: res.correo || request.correo,
            roles: Array.from(res.roles || []),
            token: res.token
          };
          
          localStorage.setItem('token', res.token);
          localStorage.setItem('correo', userSession.correo);
          localStorage.setItem('roles', JSON.stringify(userSession.roles));
          
          this.session.set(userSession);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('correo');
    localStorage.removeItem('roles');
    this.session.set(null);
  }

  forgotPassword(request: any): Observable<string> {
    return this.http.post(`${this.apiUrl}/forgot-password`, request, { responseType: 'text' });
  }

  resetPassword(request: any): Observable<string> {
    return this.http.post(`${this.apiUrl}/reset-password`, request, { responseType: 'text' });
  }

  changePassword(request: any): Observable<string> {
    return this.http.put(`${this.apiUrl}/change-password`, request, { responseType: 'text' });
  }

  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/profile`);
  }

  private loadSessionFromStorage(): UserSession | null {
    const token = localStorage.getItem('token');
    const correo = localStorage.getItem('correo');
    const rolesStr = localStorage.getItem('roles');
    
    if (token && correo && rolesStr) {
      try {
        const roles = JSON.parse(rolesStr);
        return { token, correo, roles };
      } catch {
        return null;
      }
    }
    return null;
  }
}
