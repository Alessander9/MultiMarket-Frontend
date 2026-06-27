import '@angular/compiler';
import { describe, it, expect, vi } from 'vitest';

let activeCustomerService: any;
let activeRouter: any;

vi.mock('@angular/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/core')>();
  return {
    ...original,
    inject: (token: any) => {
      if (token?.name === 'CustomerService') return activeCustomerService;
      if (token?.name === 'Router') return activeRouter;
      return {};
    }
  };
});

import { CustomerNotifications } from './notifications';

describe('CustomerNotifications', () => {
  it('opens the matching conversation when a chat notification is clicked', () => {
    activeRouter = {
      navigate: vi.fn()
    };

    activeCustomerService = {
      notifications: () => [],
      conversations: () => [
        {
          id: 31,
          vendedorNombreTienda: 'Tienda QA'
        }
      ],
      resolveConversationIdFromNotification: () => 31,
      markNotificationRead: vi.fn(),
      markNotificationsRead: vi.fn(),
      deleteNotification: vi.fn()
    };

    const component = new CustomerNotifications();

    component.openNotification({
      id: 55,
      tipo: 'CHAT',
      titulo: 'Respuesta de Tienda QA',
      contenido: 'La tienda Tienda QA te respondió: hola',
      fecha: new Date().toISOString(),
      leido: false
    });

    expect(activeRouter.navigate).toHaveBeenCalledWith(['/chat'], {
      queryParams: { conversationId: 31 }
    });
    expect(activeCustomerService.markNotificationRead).toHaveBeenCalledWith(55);
  });
});
