import { Component, inject, signal, computed, effect, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SellerService, SellerConversation, SellerMessage } from '../../../services/seller.service';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-seller-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class SellerChat implements OnInit, OnDestroy, AfterViewChecked {
  protected readonly sellerService = inject(SellerService);
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;

  // Selected thread conversation ID
  readonly activeConvId = signal<number | null>(null);

  // Pending conversation selected from route before the backend list finishes loading.
  private pendingConversationId: number | null = null;

  // New message input
  readonly messageText = signal('');

  // Local state helper
  readonly isSending = signal(false);

  constructor() {
    effect(() => {
      const convs = this.sellerService.conversations();
      const backendLoaded = this.sellerService.backendLoaded();
      const pendingConversationId = this.pendingConversationId;

      if (pendingConversationId !== null) {
        const pendingConversation = convs.find(conv => conv.id === pendingConversationId);
        if (pendingConversation) {
          this.pendingConversationId = null;
          if (this.activeConvId() !== pendingConversation.id) {
            this.selectConversation(pendingConversation.id);
          }
          return;
        }
      }

      if (backendLoaded && convs.length > 0 && this.activeConvId() === null) {
        this.selectConversation(convs[0].id);
      }
    });
  }

  ngOnInit(): void {
    this.sellerService.loadBackendData().subscribe();

    const email = this.authService.currentUserEmail();
    if (email) {
      this.chatService.connect(email);
    }

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const rawConversationId = params.get('conversationId') ?? params.get('chatConversationId');
        if (!rawConversationId) return;

        const conversationId = Number(rawConversationId);
        if (!Number.isFinite(conversationId)) return;

        this.pendingConversationId = conversationId;

        const existing = this.sellerService.conversations().find(c => c.id === conversationId);
        if (existing) {
          this.pendingConversationId = null;
          this.selectConversation(conversationId);
        }
      });
  }

  ngOnDestroy(): void {
    this.chatService.disconnect();
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
