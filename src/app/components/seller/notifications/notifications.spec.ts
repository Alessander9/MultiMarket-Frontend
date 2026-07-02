import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';

let activeSellerService: any;
let activeRouter: any;

vi.mock('@angular/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/core')>();
  return {
    ...original,
    inject: (token: any) => {
      if (token?.name === 'SellerService') return activeSellerService;
      if (token?.name === 'Router') return activeRouter;
      return {};
    }
  };
});

import { SellerNotifications } from './notifications';

describe('SellerNotifications', () => {
  it('opens the matching chat conversation when clicking a chat notification', () => {
    activeRouter = {
      navigate: vi.fn()
    };

    activeSellerService = {
      notifications: () => [],
      conversations: () => [
        {
          id: 21,
          compradorNombre: 'comprador',
          compradorCorreo: 'comprador@multimarket.com'
        }
      ],
      markNotificationAsRead: vi.fn(),
      markAllNotificationsAsRead: vi.fn()
    };

    const component = new SellerNotifications();

    component.openNotification({
      id: 101,
      tipo: 'CHAT',
      titulo: 'Nuevo mensaje de comprador',
      contenido: 'El comprador comprador te escribió: hola',
      fecha: new Date().toISOString(),
      leido: false
    });

    expect(activeRouter.navigate).toHaveBeenCalledWith(['/seller/chat'], {
      queryParams: { conversationId: 21 }
    });
    expect(activeSellerService.markNotificationAsRead).toHaveBeenCalledWith(101);
  });
});
