import { Component, signal, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);
  protected readonly themeService = inject(ThemeService);
  protected readonly title = signal('MultiMarketFrontend');
  protected readonly currentUrl = signal('/');
  protected readonly showGlobalThemeToggle = computed(() => {
    const url = this.currentUrl();
    return url.startsWith('/login');
  });

  constructor() {
    this.currentUrl.set(this.router.url || '/');
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects || event.url);
      }
    });
  }
}
