import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Subject, of } from 'rxjs';

let activeAuthMock: any;
let activeChatMock: any;
let activeHttpMock: any;

vi.mock('@angular/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/core')>();
  return {
    ...original,
    inject: (token: any) => {
      if (token?.name === 'AuthService') {
        return activeAuthMock;
      }
      if (token?.name === 'ChatService') {
        return activeChatMock;
      }
      return activeHttpMock;
    }
  };
});

vi.mock('../../environments/environment', () => ({
  environment: {
    production: false,
    apiUrl: 'http://localhost:8080'
  }
}));

import { CustomerService } from './customer.service';
import { SellerService } from './seller.service';

function createCustomerMocks(notifications: any[] = []) {
  const messageReceived$ = new Subject<any>();
  activeAuthMock = {
    currentUserEmail: () => 'buyer@test.com',
    currentUserRoles: () => ['COMPRADOR']
  };
  activeChatMock = {
    messageReceived$,
    connectionStatus$: new Subject<any>(),
    sendMessageViaSocket: () => false,
    createConversation: () => of(null),
    getConversations: () => of([]),
    getMessageHistory: () => of([]),
    sendMessage: () => of({})
  };
  activeHttpMock = {
    get: (url: string) => {
      if (url.includes('/notificaciones')) {
        return of(notifications);
      }
      if (url.includes('/chat/conversaciones')) {
        return of([]);
      }
      return of([]);
    },
    post: () => of({}),
    put: () => of({}),
    delete: () => of({})
  };

  return messageReceived$;
}

function createSellerMocks(notifications: any[] = []) {
  const messageReceived$ = new Subject<any>();
  activeAuthMock = {
    currentUserEmail: () => 'seller@test.com',
    currentUserRoles: () => ['VENDEDOR']
  };
  activeChatMock = {
    messageReceived$,
    connectionStatus$: new Subject<any>(),
    sendMessageViaSocket: () => false,
    createConversation: () => of(null),
    getConversations: () => of([]),
    getMessageHistory: () => of([]),
    sendMessage: () => of({})
  };
  activeHttpMock = {
    get: (url: string) => {
      if (url.includes('/notificaciones')) {
        return of(notifications);
      }
      if (url.includes('/chat/conversaciones')) {
        return of([]);
      }
      return of([]);
    },
    post: () => of({}),
    put: () => of({}),
    delete: () => of({})
  };

  return messageReceived$;
}

describe('Chat notifications integration', () => {
  it('refreshes buyer notifications when a seller message arrives', () => {
    const buyerNotifications = [
      {
        id: 901,
        tipo: 'CHAT',
        titulo: 'Respuesta de Tienda QA',
        contenido: 'La tienda Tienda QA te respondió: Tenemos stock disponible.',
        fecha: new Date().toISOString(),
        leido: false
      }
    ];
    const messageReceived$ = createCustomerMocks(buyerNotifications);
    const customerService = new CustomerService();

    customerService.conversations.set([
      {
        id: 11,
        vendedorId: 10,
        vendedorNombreTienda: 'Tienda QA',
        vendedorLogo: '/img/frutosSecos.jpg',
        ultimoMensaje: '',
        fechaUltimoMensaje: new Date().toISOString(),
        noLeidos: 0,
        mensajes: []
      }
    ]);

    messageReceived$.next({
      type: 'NEW_MESSAGE',
      conversacionId: 11,
      data: {
        id: 71,
        contenido: 'Tenemos stock disponible.',
        fechaEnvio: new Date().toISOString(),
        leido: false,
        remitenteCorreo: 'seller@test.com'
      }
    });

    expect(customerService.conversations()[0].noLeidos).toBe(1);
    expect(customerService.notifications()).toHaveLength(1);
    expect(customerService.unreadNotificationsCount()).toBe(1);
    expect(customerService.notifications()[0].tipo).toBe('CHAT');
  });

  it('refreshes seller notifications when a buyer message arrives', () => {
    const sellerNotifications = [
      {
        id: 777,
        tipo: 'CHAT',
        titulo: 'Nuevo mensaje de Buyer',
        contenido: 'El comprador Buyer te escribió: ¿Tienen envío hoy?',
        fecha: new Date().toISOString(),
        leido: false
      }
    ];
    const messageReceived$ = createSellerMocks(sellerNotifications);
    const sellerService = new SellerService();

    sellerService.conversations.set([
      {
        id: 22,
        compradorNombre: 'Buyer',
        compradorCorreo: 'buyer@test.com',
        compradorAvatar: '/img/AdultoMayor.jpg',
        ultimoMensaje: '',
        fechaUltimoMensaje: new Date().toISOString(),
        noLeidos: 0,
        mensajes: []
      }
    ]);

    messageReceived$.next({
      type: 'NEW_MESSAGE',
      conversacionId: 22,
      data: {
        id: 72,
        contenido: '¿Tienen envío hoy?',
        fechaEnvio: new Date().toISOString(),
        leido: false,
        remitenteCorreo: 'buyer@test.com'
      }
    });

    expect(sellerService.conversations()[0].noLeidos).toBe(1);
    expect(sellerService.notifications()).toHaveLength(1);
    expect(sellerService.unreadNotificationsCount()).toBe(1);
    expect(sellerService.notifications()[0].tipo).toBe('CHAT');
  });
});
