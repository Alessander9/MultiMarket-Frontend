import { Component, inject, signal, computed, effect, OnInit, OnDestroy, ViewChild, ElementRef, DestroyRef } from '@angular/core';
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
export class SellerChat implements OnInit, OnDestroy {
  protected readonly sellerService = inject(SellerService);
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;

  // Selected thread conversation ID
  readonly activeConvId = signal<number | null>(null);

  // Pending conversation selected from route before the backend list finishes loading.
  readonly pendingConversationId = signal<number | null>(null);

  // New message input
  readonly messageText = signal('');

  // Local state helper
  readonly isSending = signal(false);
  readonly showScrollToBottom = signal(false);
  private lastScrollSignature = '';
  private scrollAnimationFrame: number | null = null;

  constructor() {
    effect(() => {
      const convs = this.sellerService.conversations();
      const backendLoaded = this.sellerService.backendLoaded();
      const pendingConversationId = this.pendingConversationId();
      const activeConversationId = this.activeConvId();
      const activeConversation = activeConversationId !== null ? convs.find(conv => conv.id === activeConversationId) : null;
      const signature = `${activeConversationId ?? 'none'}:${activeConversation?.mensajes?.length ?? 0}`;

      if (pendingConversationId !== null) {
        const pendingConversation = convs.find(conv => conv.id === pendingConversationId);
        if (pendingConversation) {
          if (activeConversationId !== pendingConversation.id) {
            this.selectConversation(pendingConversation.id);
          }
          this.pendingConversationId.set(null);
          return;
        }

        return;
      }

      if (backendLoaded && convs.length > 0 && activeConversationId === null) {
        this.selectConversation(convs[0].id);
      }

      if (signature !== this.lastScrollSignature && activeConversation) {
        this.lastScrollSignature = signature;
        this.scheduleScrollToBottom();
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

        this.pendingConversationId.set(conversationId);

        const existing = this.sellerService.conversations().find(c => c.id === conversationId);
        if (existing) {
          this.pendingConversationId.set(null);
          this.selectConversation(conversationId);
        }
      });
  }

  ngOnDestroy(): void {
    this.chatService.disconnect();
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
        this.scheduleScrollToBottom();
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
        this.scheduleScrollToBottom();
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

  onChatScroll(): void {
    const el = this.chatScrollContainer?.nativeElement;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.showScrollToBottom.set(distanceFromBottom > 120);
  }

  scrollToLatestMessage(): void {
    this.scrollToBottom(true);
  }

  private scheduleScrollToBottom(): void {
    if (this.scrollAnimationFrame !== null) {
      cancelAnimationFrame(this.scrollAnimationFrame);
    }

    this.scrollAnimationFrame = requestAnimationFrame(() => {
      this.scrollAnimationFrame = null;
      this.scrollToBottom(true);
    });
  }

  private scrollToBottom(smooth = false): void {
    if (this.chatScrollContainer) {
      try {
        const el = this.chatScrollContainer.nativeElement;
        el.scrollTo({
          top: el.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
        this.showScrollToBottom.set(false);
      } catch (err) {
        // Safe fail
      }
    }
  }
}
