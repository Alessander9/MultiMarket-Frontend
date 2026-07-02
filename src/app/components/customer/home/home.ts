import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../../services/customer.service';
import { AdminPortalService } from '../../../services/admin-portal.service';

interface HomeCategoryCard {
  name: string;
  cat: string;
  count: number;
  icon: string;
  tone: string;
  description: string;
}

type BentoCardKind = 'store' | 'product' | 'promo';
type BentoCardSize = 'hero' | 'banner' | 'small' | 'medium' | 'tall';

interface MarketplaceBentoCard {
  id: string;
  kind: BentoCardKind;
  size: BentoCardSize;
  slotClass: string;
  title: string;
  subtitle: string;
  badge: string;
  image: string;
  meta: string;
  cta: string;
  rating?: number;
  footerPrimary: string;
  footerSecondary: string;
  vendorId?: number;
  vendorName?: string;
  productId?: number;
  category?: string;
}

@Component({
  selector: 'app-customer-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class CustomerHome implements OnInit, OnDestroy {
  protected readonly customerService = inject(CustomerService);
  protected readonly portalService = inject(AdminPortalService);
  private readonly router = inject(Router);
  private readonly productImagePool = [
    '/img/aceite-coco.jpeg',
    '/img/aceite-oliva.jpeg',
    '/img/algarrobina.jpg',
    '/img/chia.jpeg',
    '/img/colageno-hidrolizado.jpeg',
    '/img/colageno.jpg',
    '/img/curcuma.jpg',
    '/img/jamaica.jpeg',
    '/img/kiwicha-pop.jpeg',
    '/img/linaza-molida.jpeg',
    '/img/maca-negra.jpeg',
    '/img/magnesio.jpg',
    '/img/miel.jpg',
    '/img/moringa.jpg',
    '/img/pecanas.jpeg',
    '/img/polen-abeja.jpeg',
    '/img/potasio.jpg',
    '/img/propoleo.jpg',
    '/img/quinua-pop.jpeg',
    '/img/Saludable.jpeg',
    '/img/stevia-yacon.jpeg',
    '/img/super-alimentos-bg.jpeg',
    '/img/Vitalidad.jpg'
  ];

  private readonly storeImagePool = [
    '/img/frutos-secos-bg.jpeg',
    '/img/frutosSecos.jpg',
    '/img/super-alimentos-bg.jpeg',
    '/img/Vitalidad.jpg',
    '/img/miel.jpg',
    '/img/moringa.jpg',
    '/img/pecanas.jpeg',
    '/img/quinua-pop.jpeg'
  ];

  // local loading states
  readonly isLoading = signal(false);

  // Sorted list helpers for neat organization
  readonly featuredVendors = computed(() => {
    return [...this.portalService.vendors()]
      .filter(v => v.activo)
      .sort((a, b) => b.calificacionPromedio - a.calificacionPromedio)
      .slice(0, 6);
  });

  readonly storeShowcaseVendors = computed(() => {
    return [...this.portalService.vendors()]
      .filter(v => v.activo)
      .sort((a, b) => b.calificacionPromedio - a.calificacionPromedio)
      .slice(0, 8);
  });

  readonly activeProducts = computed(() => {
    return [...this.portalService.products()]
      .filter(p => p.activo !== false);
  });

  readonly recommendedProducts = computed(() => {
    return [...this.activeProducts()]
      .sort((a, b) => {
        if (b.stock !== a.stock) return b.stock - a.stock;
        if (a.precio !== b.precio) return a.precio - b.precio;
        return a.nombre.localeCompare(b.nombre);
      })
      .slice(0, 9);
  });

  readonly featuredProduct = computed(() => this.recommendedProducts()[0] ?? null);

  readonly featuredStore = computed(() => this.featuredVendors()[0] ?? null);

  readonly productBentoCards = computed<MarketplaceBentoCard[]>(() => {
    const products = this.recommendedProducts();

    const productA = products[0] ?? null;
    const productB = products[1] ?? products[0] ?? null;
    const productC = products[2] ?? products[1] ?? products[0] ?? null;
    const productD = products[3] ?? products[2] ?? products[0] ?? null;
    const productE = products[4] ?? products[3] ?? products[1] ?? null;
    const productF = products[5] ?? products[4] ?? products[2] ?? null;
    const productG = products[6] ?? products[5] ?? products[3] ?? null;
    const productH = products[7] ?? products[6] ?? products[4] ?? null;

    const cards: Array<MarketplaceBentoCard | null> = [
      productA ? this.buildProductCard(productA, 'hero', 'slot-hero-left') : null,
      productB ? this.buildProductCard(productB, 'banner', 'slot-banner-center') : null,
      productC ? this.buildProductCard(productC, 'small', 'slot-small-top-right') : null,
      productD ? this.buildProductCard(productD, 'medium', 'slot-medium-center-left') : null,
      productE ? this.buildProductCard(productE, 'medium', 'slot-medium-center-right') : null,
      productF ? this.buildProductCard(productF, 'medium', 'slot-medium-bottom-left') : null,
      productG ? this.buildProductCard(productG, 'medium', 'slot-medium-bottom-right') : null,
      productH ? this.buildProductCard(productH, 'tall', 'slot-tall-right') : null
    ];

    return cards.filter((card): card is MarketplaceBentoCard => Boolean(card));
  });

  readonly storeBentoCards = computed<MarketplaceBentoCard[]>(() => {
    const vendors = this.storeShowcaseVendors();

    const vendorA = vendors[0] ?? null;
    const vendorB = vendors[1] ?? vendors[0] ?? null;
    const vendorC = vendors[2] ?? vendors[1] ?? vendors[0] ?? null;
    const vendorD = vendors[3] ?? vendors[2] ?? vendors[0] ?? null;
    const vendorE = vendors[4] ?? vendors[3] ?? vendors[1] ?? null;
    const vendorF = vendors[5] ?? vendors[4] ?? vendors[2] ?? null;
    const vendorG = vendors[6] ?? vendors[5] ?? vendors[3] ?? null;
    const vendorH = vendors[7] ?? vendors[6] ?? vendors[4] ?? null;

    const cards: Array<MarketplaceBentoCard | null> = [
      vendorA ? this.buildStoreCard(vendorA, 'hero', 'slot-hero-left') : null,
      vendorB ? this.buildStoreCard(vendorB, 'banner', 'slot-banner-center') : null,
      vendorC ? this.buildStoreCard(vendorC, 'small', 'slot-small-top-right') : null,
      vendorD ? this.buildStoreCard(vendorD, 'medium', 'slot-medium-center-left') : null,
      vendorE ? this.buildStoreCard(vendorE, 'medium', 'slot-medium-center-right') : null,
      vendorF ? this.buildStoreCard(vendorF, 'medium', 'slot-medium-bottom-left') : null,
      vendorG ? this.buildStoreCard(vendorG, 'medium', 'slot-medium-bottom-right') : null,
      vendorH ? this.buildStoreCard(vendorH, 'tall', 'slot-tall-right') : null
    ];

    return cards.filter((card): card is MarketplaceBentoCard => Boolean(card));
  });

  readonly catalogCategories = computed<HomeCategoryCard[]>(() => {
    const fallback = [
      'Café',
      'Chocolate',
      'Miel',
      'Artesanías',
      'Textiles',
      'Ferretería'
    ];

    const source = this.activeProducts();
    const counts = new Map<string, number>();
    source.forEach(prod => {
      const key = (prod.categoriaNombre || 'Sin categoría').trim();
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const ordered = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8);

    const baseList = ordered.length > 0 ? ordered : fallback.map(cat => [cat, 0] as [string, number]);

    return baseList.map(([name, count]) => {
      const meta = this.getCategoryMeta(name);
      return {
        name: meta.label,
        cat: name,
        count,
        icon: meta.icon,
        tone: meta.tone,
        description: meta.description
      };
    });
  });

  readonly howItWorks = [
    {
      step: '01',
      title: 'Explora el catálogo',
      desc: 'Busca por categoría, tienda o producto y revisa imágenes, precios y disponibilidad.',
      icon: 'travel_explore'
    },
    {
      step: '02',
      title: 'Consulta por chat',
      desc: 'Habla directo con la tienda para resolver stock, envío, tallas o detalles del producto.',
      icon: 'chat'
    },
    {
      step: '03',
      title: 'Confirma tu pedido',
      desc: 'Agrega al carrito, revisa el resumen y confirma tu compra con toda la información clara.',
      icon: 'receipt_long'
    },
    {
      step: '04',
      title: 'Recíbelo en casa',
      desc: 'La tienda prepara el envío y puedes seguir el pedido hasta la entrega final.',
      icon: 'local_shipping'
    }
  ];

  readonly marketplaceHighlights = [
    {
      title: 'Curación local',
      desc: 'Productos seleccionados por tienda, categoría y valoración.',
      icon: 'star'
    },
    {
      title: 'Compra con confianza',
      desc: 'Información clara para decidir antes de sumar al carrito.',
      icon: 'verified'
    },
    {
      title: 'Atención directa',
      desc: 'El chat conecta comprador y vendedor sin pasos innecesarios.',
      icon: 'support_agent'
    },
    {
      title: 'Entrega organizada',
      desc: 'Flujo simple desde consulta hasta despacho y recepción.',
      icon: 'package_2'
    }
  ];

  // Active Promo Index for Hero Slider
  readonly promoIndex = signal(0);

  readonly currentPromo = computed(() => this.promos[this.promoIndex()]);

  readonly featuredCategories = [
    { name: 'Café Gourmet', icon: 'coffee', cat: 'Café', tone: 'coffee' },
    { name: 'Cacao', icon: 'bakery_dining', cat: 'Chocolate', tone: 'cacao' },
    { name: 'Miel Pura', icon: 'hive', cat: 'Miel', tone: 'miel' },
    { name: 'Artesanías', icon: 'brush', cat: 'Artesanías', tone: 'art' },
    { name: 'Textiles', icon: 'apparel', cat: 'Textiles', tone: 'textiles' },
    { name: 'Ferretería', icon: 'build', cat: 'Ferretería', tone: 'iron' }
  ];

  readonly experienceHighlights = [
    { title: 'Compra segura', desc: 'Pagos y pedidos trazables de extremo a extremo.', icon: 'verified' },
    { title: 'Tiendas locales', desc: 'Conecta con productores y marcas peruanas.', icon: 'storefront' },
    { title: 'Soporte en chat', desc: 'Consulta sobre stock, despacho y envíos.', icon: 'chat' }
  ];

  readonly trustStats = [
    { value: '250+', label: 'Productos activos' },
    { value: '40+', label: 'Tiendas verificadas' },
    { value: '24/7', label: 'Soporte y seguimiento' }
  ];

  private promoTimer?: ReturnType<typeof setInterval>;

  // Promo banners curated locally
  readonly promos = [
    {
      title: 'Cafés de origen con identidad local',
      subtitle: 'Granos seleccionados, tostado fresco y opciones premium para una compra más cuidada.',
      buttonText: 'Explorar café',
      img: '/img/super-alimentos-bg.jpeg',
      cat: 'Café'
    },
    {
      title: 'Chocolate artesanal y cacao fino',
      subtitle: 'Descubre sabores intensos, empaques premium y marcas con sello local.',
      buttonText: 'Ver chocolates',
      img: '/img/frutos-secos-bg.jpeg',
      cat: 'Chocolate'
    },
    {
      title: 'Artesanías y diseño hecho a mano',
      subtitle: 'Piezas únicas, cultura y detalles que convierten cada compra en algo especial.',
      buttonText: 'Explorar artesanías',
      img: '/img/frutosSecos.jpg',
      cat: 'Artesanías'
    },
    {
      title: 'Herramientas y ferretería listas para trabajo',
      subtitle: 'Soluciones de uso diario con disponibilidad y soporte directo de la tienda.',
      buttonText: 'Ir a ferretería',
      img: '/img/Vitalidad.jpg',
      cat: 'Ferretería'
    }
  ];

  ngOnInit(): void {
    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
    }, 350);

    // Auto rotate banners every 5 seconds
    this.promoTimer = setInterval(() => {
      this.promoIndex.update(idx => (idx + 1) % this.promos.length);
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.promoTimer) {
      clearInterval(this.promoTimer);
    }
  }

  selectPromoCat(catName: string): void {
    this.router.navigate(['/products'], { queryParams: { category: catName } });
  }

  browseVendor(vendorId: number, vendorName: string): void {
    this.router.navigate(['/products'], { queryParams: { vendorId, vendorName } });
  }

  openMarketplaceCard(card: MarketplaceBentoCard, event: Event): void {
    event.stopPropagation();

    if (card.kind === 'promo') {
      if (card.category) {
        this.selectPromoCat(card.category);
      } else {
        this.router.navigate(['/products']);
      }
      return;
    }

    if (card.kind === 'product' && card.productId) {
      this.router.navigate(['/products', card.productId]);
      return;
    }

    if (card.kind === 'store' && card.vendorId) {
      this.router.navigate(['/products'], {
        queryParams: {
          vendorId: card.vendorId,
          vendorName: card.vendorName ?? undefined
        }
      });
    }
  }

  addToCart(prod: any, event: Event): void {
    event.stopPropagation();
    this.customerService.addToCart(prod, 1);
    this.customerService.showToast(`¡"${prod.nombre}" añadido al carrito!`, 'success');
  }

  toggleFavorite(prodId: number, event: Event): void {
    event.stopPropagation();
    this.customerService.toggleFavorite(prodId);
  }

  // Helper to lookup vendor name from database
  getVendorName(vendorId: number): string {
    return this.portalService.vendors().find(v => v.id === vendorId)?.nombreTienda || 'Tienda Oficial';
  }

  getStoreProductCount(vendorId: number): number {
    return this.portalService.products().filter(p => p.vendedorId === vendorId && p.activo !== false).length;
  }

  private buildStoreCard(vendor: any, size: BentoCardSize, slotClass: string): MarketplaceBentoCard {
    const productCount = this.getStoreProductCount(vendor.id);
    const rating = Number(vendor.calificacionPromedio ?? 0);
    const subtitle = vendor.descripcion?.trim()
      || `Catálogo activo de ${vendor.nombreTienda} con atención directa y despacho según región.`;
    const image = this.pickStoreImage(vendor.id, vendor.nombreTienda);

    return {
      id: `store-${vendor.id}-${size}`,
      kind: 'store',
      size,
      slotClass,
      title: vendor.nombreTienda,
      subtitle,
      badge: `${vendor.region}`,
      image,
      rating,
      meta: `Valoración ${rating.toFixed(1)} · ${productCount} productos`,
      cta: `Abrir ${vendor.nombreTienda}`,
      footerPrimary: `${productCount} productos activos`,
      footerSecondary: `Región ${vendor.region}`,
      vendorId: vendor.id,
      vendorName: vendor.nombreTienda
    };
  }

  private buildProductCard(product: any, size: BentoCardSize, slotClass: string): MarketplaceBentoCard {
    const vendorName = this.getVendorName(product.vendedorId);
    const vendor = this.portalService.vendors().find(v => v.id === product.vendedorId);
    const rating = Number(vendor?.calificacionPromedio ?? 0);
    const price = Number(product.precio).toFixed(2);
    const stock = Number(product.stock ?? 0);
    const category = product.categoriaNombre || 'Producto local';
    const image = this.pickProductImage(product.id, product.nombre, product.categoriaNombre);

    return {
      id: `product-${product.id}-${size}`,
      kind: 'product',
      size,
      slotClass,
      title: product.nombre,
      subtitle: product.descripcion?.trim()
        || `Ficha de ${product.nombre} para revisar detalle, disponibilidad y compra directa.`,
      badge: stock > 0 ? `${stock} uds disponibles` : 'Agotado',
      image,
      rating,
      meta: `${category} · ${vendorName}`,
      cta: `Abrir ${product.nombre}`,
      footerPrimary: `S/ ${price}`,
      footerSecondary: stock > 0 ? `Stock ${stock} uds` : 'Sin stock',
      productId: product.id,
      vendorId: product.vendedorId,
      vendorName,
      category: product.categoriaNombre
    };
  }

  private pickProductImage(seed: number, name: string, category?: string): string {
    const pool = [...this.productImagePool];
    const normalized = `${seed}-${name}-${category ?? ''}`.toLowerCase();
    const index = normalized.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % pool.length;
    return pool[index];
  }

  private pickStoreImage(seed: number, name: string): string {
    const normalized = `${seed}-${name}`.toLowerCase();
    const index = normalized.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % this.storeImagePool.length;
    return this.storeImagePool[index];
  }

  private getCategoryMeta(category: string): { label: string; icon: string; tone: string; description: string } {
    const key = category.toLowerCase();
    if (key.includes('café')) {
      return { label: 'Café Gourmet', icon: 'coffee', tone: 'coffee', description: 'Aromas intensos y tostado fresco.' };
    }
    if (key.includes('chocolate') || key.includes('cacao')) {
      return { label: 'Chocolate y Cacao', icon: 'bakery_dining', tone: 'cacao', description: 'Cacao fino y productos artesanales.' };
    }
    if (key.includes('miel')) {
      return { label: 'Miel Natural', icon: 'hive', tone: 'miel', description: 'Productos dulces y naturales de origen local.' };
    }
    if (key.includes('artesan') || key.includes('manualidad')) {
      return { label: 'Artesanías', icon: 'brush', tone: 'art', description: 'Piezas hechas a mano con identidad.' };
    }
    if (key.includes('textil') || key.includes('ropa') || key.includes('moda')) {
      return { label: 'Textiles', icon: 'apparel', tone: 'textiles', description: 'Diseño, moda y confección local.' };
    }
    if (key.includes('ferreter') || key.includes('herramient') || key.includes('constru')) {
      return { label: 'Ferretería', icon: 'build', tone: 'iron', description: 'Soluciones para casa y trabajo.' };
    }
    return { label: category, icon: 'inventory_2', tone: 'slate', description: 'Explora más productos relacionados.' };
  }
}
