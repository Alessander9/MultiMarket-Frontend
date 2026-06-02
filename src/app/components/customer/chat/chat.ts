import { Component, inject, signal, ElementRef, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CustomerService, BuyerConversation } from '../../../services/customer.service';

@Component({
  selector: 'app-customer-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class CustomerChat {
  protected readonly customerService = inject(CustomerService);

  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;

  selectedConvId = signal<number | null>(401); // Default to the pre-loaded Altomayo gourmet chat
  typedMessage = signal<string>('');

  ngOnInit(): void {
    this.markSelectedAsRead();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  getSelectedConversation(): BuyerConversation | undefined {
    return this.customerService.conversations().find(c => c.id === this.selectedConvId());
  }

  selectConversation(id: number): void {
    this.selectedConvId.set(id);
    this.markSelectedAsRead();
    this.scrollToBottom();
  }

  private markSelectedAsRead(): void {
    const conv = this.getSelectedConversation();
    if (conv && conv.noLeidos > 0) {
      this.customerService.conversations.update(list => list.map(c => {
        if (c.id === conv.id) {
          return { ...c, noLeidos: 0 };
        }
        return c;
      }));
    }
  }

  sendMessage(): void {
    const text = this.typedMessage().trim();
    const conv = this.getSelectedConversation();
    if (!text || !conv) return;

    this.customerService.sendChatMessage(conv.vendedorId, text).subscribe({
      next: () => {
        this.typedMessage.set('');
        this.scrollToBottom();
      }
    });
  }

  // Simulate attaching an image (e.g. coffee quality checks or receipt uploads)
  attachImage(): void {
    const conv = this.getSelectedConversation();
    if (!conv) return;

    const mockImgUrl = 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400';
    this.customerService.sendChatMessage(conv.vendedorId, `📷 Foto adjunta del lote: ${mockImgUrl}`).subscribe({
      next: () => {
        this.scrollToBottom();
      }
    });
  }

  private scrollToBottom(): void {
    try {
      if (this.chatScrollContainer) {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }
}
