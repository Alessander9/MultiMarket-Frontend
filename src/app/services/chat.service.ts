import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Message {
  id?: number;
  conversacionId: number;
  remitenteCorreo: string;
  contenido: string;
  fechaEnvio: string;
  leido: boolean;
}

export interface Conversation {
  id: number;
  fechaCreacion: string;
  activa: boolean;
  compradorCorreo: string;
  vendedorNombreTienda: string;
  vendedorId: number;
  ultimoMensaje?: string;
  fechaUltimoMensaje?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/chat`;

  private socket: WebSocket | null = null;
  readonly messageReceived$ = new Subject<any>();
  readonly connectionStatus$ = new Subject<'CONNECTED' | 'DISCONNECTED' | 'ERROR'>();

  // Establish real-time WebSocket connection
  connect(email: string): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Convert http/https base url to ws/wss
    const wsBase = environment.apiUrl.replace(/^http/, 'ws');
    const url = `${wsBase}/chat-websocket?email=${encodeURIComponent(email)}`;
    
    console.log(`[WebSocket] Connecting to: ${url}`);
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('[WebSocket] Connection successfully opened.');
      this.connectionStatus$.next('CONNECTED');
    };

    this.socket.onmessage = (event) => {
      console.log('[WebSocket] Raw message received:', event.data);
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'MESSAGE_ACK' || payload.type === 'NEW_MESSAGE') {
          this.messageReceived$.next(payload);
        } else if (payload.type === 'ERROR') {
          console.error('[WebSocket] Server returned error:', payload.message);
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse WebSocket payload:', err);
      }
    };

    this.socket.onerror = (error) => {
      console.error('[WebSocket] Error occurred:', error);
      this.connectionStatus$.next('ERROR');
    };

    this.socket.onclose = (event) => {
      console.log('[WebSocket] Connection closed. Code:', event.code, 'Reason:', event.reason);
      this.connectionStatus$.next('DISCONNECTED');
      this.socket = null;
      
      // Auto-reconnect after 5 seconds if connection closed unexpectedly
      if (!event.wasClean) {
        console.log('[WebSocket] Reconnecting in 5 seconds...');
        setTimeout(() => this.connect(email), 5000);
      }
    };
  }

  // Disconnect WebSocket
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  // Send message over WebSocket, return false if socket is not connected
  sendMessageViaSocket(conversacionId: number, remitenteCorreo: string, contenido: string): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const payload = {
        conversacionId,
        remitenteCorreo,
        contenido
      };
      this.socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  // --- REST HTTP Fallbacks & Helpers ---

  // Create a chat thread between the current user (buyer) and a vendor
  createConversation(vendedorId: number): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.apiUrl}/conversaciones`, { vendedorId });
  }

  // Get all conversation threads for the current logged-in user (as buyer or vendor)
  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.apiUrl}/conversaciones`);
  }

  // Get message history for a specific conversation thread
  getMessageHistory(conversationId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/conversaciones/${conversationId}/mensajes`);
  }

  // Send a message within a conversation thread (REST)
  sendMessage(conversationId: number, content: string): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/conversaciones/${conversationId}/mensajes`, { contenido: content });
  }
}
