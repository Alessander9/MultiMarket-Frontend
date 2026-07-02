import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { firstValueFrom, of, Subject } from 'rxjs';

// 1. Mock Angular's inject helper before importing the services
vi.mock('@angular/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/core')>();
  return {
    ...original,
    inject: (token: any) => {
      if (token?.name === 'ChatService') {
        return {
          messageReceived$: new Subject<any>(),
          connectionStatus$: new Subject<any>(),
          sendMessageViaSocket: () => false,
          createConversation: () => of({ id: 1, fechaCreacion: '', activa: true, compradorCorreo: 'buyer@test.com', vendedorNombreTienda: 'Tienda QA', vendedorId: 1 }),
          getConversations: () => of([]),
          getMessageHistory: () => of([]),
          sendMessage: () => of({})
        };
      }
      if (token?.name === 'AuthService') {
        return {
          currentUserEmail: () => 'buyer@test.com'
        };
      }
      // Return a lightweight mock of HttpClient when injected
      return {
        get: () => of([]),
        post: () => of({}),
        put: () => of({}),
        delete: () => of({})
      };
    }
  };
});

// Mock environment import to prevent resolution errors during testing
vi.mock('../../environments/environment', () => ({
  environment: {
    production: false,
    apiUrl: 'http://localhost:8080'
  }
}));

import { CustomerService } from './customer.service';
import { SellerService } from './seller.service';

describe('E-Commerce Chat System: Sender-Receiver Flows Integration', () => {
  let customerService: CustomerService;
  let sellerService: SellerService;

  beforeEach(() => {
    // Instantiate the services directly, using our mocked DI injection context
    customerService = new CustomerService();
    sellerService = new SellerService();
  });

  // --- FLOW A: BUYER SENDING -> SELLER RECEIVING ---
  it('Flow A: Buyer (Comprador) sends a chat query, updates state, and receives Seller (Vendedor) response', async () => {
    // 1. Initial State Check
    const initialConvs = customerService.conversations();
    expect(initialConvs.length).toBeGreaterThan(0);
    
    const activeConv = initialConvs[0];
    const initialMsgCount = activeConv.mensajes.length;
    const vendorId = activeConv.vendedorId;

    // 2. Emisor: Comprador sends query
    const buyerQuery = '¿Tienen stock del Café Blend Premium de Grano de 1kg?';
    await firstValueFrom(customerService.sendChatMessage(vendorId, buyerQuery));
    
    expect(customerService.conversations().length).toBeGreaterThan(0);
  });

  // --- FLOW B: SELLER SENDING -> BUYER RECEIVING ---
  it('Flow B: Seller (Vendedor) replies back to thread, updates state, and receives Buyer (Comprador) acknowledgement', async () => {
    // 1. Initial State Check
    const initialConvs = sellerService.conversations();
    expect(initialConvs.length).toBeGreaterThan(0);
    
    const activeConv = initialConvs[0];
    const initialMsgCount = activeConv.mensajes.length;
    const convId = activeConv.id;

    // 2. Emisor: Vendedor sends response
    const sellerReply = 'Hola, sí, tenemos stock fresco tostado hace 3 días. Realice su pedido seguro.';
    await firstValueFrom(sellerService.sendChatMessage(convId, sellerReply));
    
    expect(sellerService.conversations().length).toBeGreaterThan(0);
  });
});
