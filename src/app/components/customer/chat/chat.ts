import { AfterViewChecked, Component, DestroyRef, ElementRef, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CustomerService } from '../../../services/customer.service';

@Component({
  selector: 'app-customer-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class CustomerChat {
  protected readonly customerService = inject(CustomerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;

  readonly selectedConvId = signal<number | null>(null);
  readonly typedMessage = signal<string>('');
  readonly isOpeningConversation = signal(false);
  readonly quickPrompts = [
    'Hola, quisiera saber si hay stock disponible.',
    '¿Cuánto demora el envío a mi distrito?',
    '¿Tienen variantes, tallas o presentaciones adicionales?'
  ];

  readonly activeConversation = computed(() => {
    const selectedId = this.selectedConvId();
    if (selectedId === null) return undefined;
    return this.customerService.conversations().find(c => c.id === selectedId);
  });

  readonly sortedConversations = computed(() => {
    return [...this.customerService.conversations()].sort((a, b) => {
      const unreadDiff = (b.noLeidos ?? 0) - (a.noLeidos ?? 0);
      if (unreadDiff !== 0) return unreadDiff;
      return new Date(b.fechaUltimoMensaje).getTime() - new Date(a.fechaUltimoMensaje).getTime();
    });
  });

  readonly suggestedVendors = computed(() => {
    const conversationVendorIds = new Set(this.customerService.conversations().map(conv => conv.vendedorId));
    return this.customerService.topVendors().filter(vendor => !conversationVendorIds.has(vendor.id)).slice(0, 3);
  });

  constructor() {
    effect(() => {
      const conversations = this.customerService.conversations();
      const selectedId = this.selectedConvId();

      if (!conversations.length) {
        if (selectedId !== null) {
          this.selectedConvId.set(null);
        }
        return;
      }

      const selectedExists = selectedId !== null && conversations.some(conv => conv.id === selectedId);
      if (!selectedExists) {
        const target = conversations.find(conv => conv.noLeidos > 0) ?? conversations[0];
        if (target) {
          this.selectedConvId.set(target.id);
          this.loadConversationHistory(target.id);
        }
      }
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const rawVendorId = params.get('vendorId') ?? params.get('chatVendorId');
        if (!rawVendorId) {
          this.autoSelectConversation();
          return;
        }

        const vendorId = Number(rawVendorId);
        if (!Number.isFinite(vendorId)) return;

        this.openConversationForVendor(vendorId);
      });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  selectConversation(id: number): void {
    this.selectedConvId.set(id);
    this.loadConversationHistory(id);
  }

  openConversationForVendor(vendorId: number): void {
    this.isOpeningConversation.set(true);
    this.customerService.openConversation(vendorId).subscribe({
      next: conv => {
        this.selectedConvId.set(conv.id);
        this.loadConversationHistory(conv.id);
        this.isOpeningConversation.set(false);
      },
      error: () => {
        this.isOpeningConversation.set(false);
      }
    });
  }

  openSuggestedVendor(vendorId: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { vendorId },
      queryParamsHandling: 'merge'
    });
  }

  useQuickPrompt(prompt: string): void {
    this.typedMessage.set(prompt);
  }

  getMessageRoleLabel(role: 'COMPRADOR' | 'VENDEDOR'): string {
    return role === 'COMPRADOR' ? 'Comprador' : 'Vendedor';
  }

  getMessageDirectionLabel(role: 'COMPRADOR' | 'VENDEDOR'): string {
    return role === 'COMPRADOR' ? 'Emisor' : 'Receptor';
  }

  isOwnMessage(role: 'COMPRADOR' | 'VENDEDOR'): boolean {
    return role === 'COMPRADOR';
  }

  private autoSelectConversation(): void {
    const conversations = this.customerService.conversations();
    if (!conversations.length) return;

    const target = conversations.find(conv => conv.noLeidos > 0) ?? conversations[0];
    if (target) {
      this.selectedConvId.set(target.id);
      this.loadConversationHistory(target.id);
    }
  }

  private loadConversationHistory(conversationId: number): void {
    this.customerService.loadMessageHistory(conversationId).subscribe({
      next: () => {
        this.markSelectedAsRead();
        this.scrollToBottom();
      }
    });
  }

  private markSelectedAsRead(): void {
    const conv = this.activeConversation();
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
    const conv = this.activeConversation();
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
    const conv = this.activeConversation();
    if (!conv) return;

    const mockImgUrl = '/img/aceite-coco.jpeg';
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
