import '@angular/compiler';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';

let routerMock: any;
let themeServiceMock: any;
let App: any;

vi.mock('@angular/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/core')>();
  return {
    ...original,
    inject: (token: any) => {
      if (token?.name === 'Router') return routerMock;
      if (token?.name === 'ThemeService') return themeServiceMock;
      return {};
    }
  };
});

describe('App', () => {
  beforeEach(async () => {
    routerMock = { url: '/', events: new Subject() };
    themeServiceMock = {};
    ({ App } = await import('./app'));
  });

  it('should create the app', () => {
    const app = new App();
    expect(app).toBeTruthy();
  });

  it('updates current url from navigation events', () => {
    const app = new App();
    routerMock.events.next(new NavigationEnd(1, '/login', '/login'));
    expect(app.currentUrl()).toBe('/login');
    expect(app.showGlobalThemeToggle()).toBe(true);
  });
});
