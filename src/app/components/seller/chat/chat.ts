import { Component, inject, signal, computed, effect, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SellerService, SellerConversation, SellerMessage } from '../../../services/seller.service';

@Component({
  selector: 'app-seller-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class SellerChat implements OnInit, AfterViewChecked {
  protected readonly sellerService = inject(SellerService);

  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;

  // Selected thread conversation ID
  readonly activeConvId = signal<number | null>(null);

  // New message input
  readonly messageText = signal('');

  // Local state helper
  readonly isSending = signal(false);

  constructor() {
    effect(() => {
      const convs = this.sellerService.conversations();
      if (convs.length > 0 && this.activeConvId() === null) {
        setTimeout(() => this.selectConversation(convs[0].id));
      }
    });
  }

  ngOnInit(): void {
    // Auto-selection is handled by the constructor effect once conversations are loaded
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  // --- GETTERS ---

  readonly activeConversation = computed(() => {
    const id = this.activeConvId();
    if (id === null) return null;
    return this.sellerService.conversations().find(c => c.id === id) || null;
  });

  // --- ACTIONS ---

  selectConversation(id: number): void {
    this.activeConvId.set(id);
    
    this.sellerService.loadMessageHistory(id).subscribe({
      next: () => {
        // Mark messages in this thread as read
        this.sellerService.conversations.update(list => list.map(c => {
          if (c.id === id) {
            return {
              ...c,
              noLeidos: 0,
              mensajes: c.mensajes.map(m => ({ ...m, leido: true }))
            };
          }
          return c;
        }));
        this.scrollToBottom();
      }
    });
  }

  sendMessage(): void {
    const text = this.messageText().trim();
    const id = this.activeConvId();
    if (!text || id === null) return;

    this.isSending.set(true);
    
    this.sellerService.sendChatMessage(id, text).subscribe({
      next: () => {
        this.isSending.set(false);
        this.messageText.set('');
        this.scrollToBottom();
      },
      error: () => {
        this.isSending.set(false);
      }
    });
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    if (this.chatScrollContainer) {
      try {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
      } catch (err) {
        // Safe fail
      }
    }
  }
}
