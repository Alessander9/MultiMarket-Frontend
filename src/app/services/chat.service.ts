import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
  private readonly apiUrl = `${environment.apiUrl}/chat`;

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

  // Send a message within a conversation thread
  sendMessage(conversationId: number, content: string): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/conversaciones/${conversationId}/mensajes`, { contenido: content });
  }
}
