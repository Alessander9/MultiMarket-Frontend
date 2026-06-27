import { Injectable, signal } from '@angular/core';

export type AppTheme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly theme = signal<AppTheme>('dark');

  constructor() {
    this.setTheme('dark');
  }

  toggleTheme(): void {
    this.setTheme('dark');
  }

  setTheme(theme: AppTheme): void {
    const resolvedTheme: AppTheme = 'dark';
    this.theme.set(theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolvedTheme);
      document.body.setAttribute('data-theme', resolvedTheme);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('multimarket-theme', resolvedTheme);
    }
  }

  private readSavedTheme(): AppTheme | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('multimarket-theme') as AppTheme | null;
  }
}
