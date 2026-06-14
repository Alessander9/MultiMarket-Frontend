import { Injectable, signal } from '@angular/core';

export type AppTheme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly theme = signal<AppTheme>('dark');

  constructor() {
    const savedTheme = this.readSavedTheme();
    const prefersLight = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches;
    this.setTheme(savedTheme ?? (prefersLight ? 'light' : 'dark'));
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: AppTheme): void {
    this.theme.set(theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('multimarket-theme', theme);
    }
  }

  private readSavedTheme(): AppTheme | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('multimarket-theme') as AppTheme | null;
  }
}
