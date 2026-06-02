import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';

// 1. Mock Angular's inject helper before importing the services
vi.mock('@angular/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/core')>();
  return {
    ...original,
    inject: (token: any) => {
      // Return a lightweight mock of HttpClient when injected
      return {
        get: () => ({ pipe: () => ({ subscribe: (cb: any) => cb() }) }),
        post: () => ({ pipe: () => ({ subscribe: (cb: any) => cb() }) }),
        put: () => ({ pipe: () => ({ subscribe: (cb: any) => cb() }) }),
        delete: () => ({ pipe: () => ({ subscribe: (cb: any) => cb() }) })
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
    
    const updatedConvs = customerService.conversations();
    const updatedConv = updatedConvs.find(c => c.vendedorId === vendorId)!;
    
    // Verify buyer query is appended immediately
    expect(updatedConv.mensajes.length).toBe(initialMsgCount + 1);
    expect(updatedConv.mensajes[updatedConv.mensajes.length - 1].remitente).toBe('COMPRADOR');
    expect(updatedConv.mensajes[updatedConv.mensajes.length - 1].contenido).toBe(buyerQuery);
    expect(updatedConv.ultimoMensaje).toBe(buyerQuery);

    // 3. Receptor: Trigger the vendor response simulation directly to test the receiver processing
    (customerService as any).simulateVendorReply(vendorId);

    const finalConvs = customerService.conversations();
    const finalConv = finalConvs.find(c => c.vendedorId === vendorId)!;

    // Verify vendor reply is appended and inbox notifications update reactively
    expect(finalConv.mensajes.length).toBe(initialMsgCount + 2);
    expect(finalConv.mensajes[finalConv.mensajes.length - 1].remitente).toBe('VENDEDOR');
    expect(customerService.notifications().some(n => n.tipo === 'CHAT')).toBe(true);
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
    
    const updatedConvs = sellerService.conversations();
    const updatedConv = updatedConvs.find(c => c.id === convId)!;

    // Verify seller reply is appended
    expect(updatedConv.mensajes.length).toBe(initialMsgCount + 1);
    expect(updatedConv.mensajes[updatedConv.mensajes.length - 1].remitente).toBe('VENDEDOR');
    expect(updatedConv.mensajes[updatedConv.mensajes.length - 1].contenido).toBe(sellerReply);
    expect(updatedConv.ultimoMensaje).toBe(sellerReply);

    // 3. Receptor: Trigger the buyer response simulation directly
    (sellerService as any).simulateBuyerReply(convId);

    const finalConvs = sellerService.conversations();
    const finalConv = finalConvs.find(c => c.id === convId)!;

    // Verify buyer reply is appended and seller notification alerts register
    expect(finalConv.mensajes.length).toBe(initialMsgCount + 2);
    expect(finalConv.mensajes[finalConv.mensajes.length - 1].remitente).toBe('COMPRADOR');
    expect(sellerService.notifications().some(n => n.tipo === 'CHAT')).toBe(true);
  });
});
