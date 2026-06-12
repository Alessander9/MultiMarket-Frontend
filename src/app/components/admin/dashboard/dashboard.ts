import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { AdminDashboardService } from '../../../services/admin-dashboard.service';
import { AdminPortalService, AdminUser, AdminRole, AdminVendor, AdminCategory, AdminProduct, InventoryMovement, AdminOrder, AdminPayment, SOAPLog, AdminChat, AdminNotification, XmlImportLog, JsonXmlExportLog } from '../../../services/admin-portal.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  protected readonly dashboardService = inject(AdminDashboardService);
  protected readonly portalService = inject(AdminPortalService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  // Layout UI Toggles
  readonly sidebarCollapsed = signal(false);
  readonly activeSection = signal('dashboard');
  readonly isLoading = signal(false);
  readonly vendorViewMode = signal<'list' | 'cards'>('list');
  
  // Header Dropdown Toggles
  readonly showNotifications = signal(false);
  readonly showProfileMenu = signal(false);

  // Global Search, Filtering, Pagination & Sorting
  readonly searchQuery = signal('');
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'info' | 'error'>('success');
  readonly currentPage = signal(1);
  readonly pageSize = 10;
  readonly sortBy = signal<string>('id');
  readonly sortAsc = signal<boolean>(true);

  readonly executiveSnapshot = computed(() => ([
    { label: 'Usuarios', value: this.portalService.users().length, hint: 'Cuentas activas en plataforma', icon: 'group', tone: 'purple' },
    { label: 'Vendedores', value: this.portalService.vendors().length, hint: 'Tiendas operativas hoy', icon: 'storefront', tone: 'emerald' },
    { label: 'Productos', value: this.portalService.products().length, hint: 'Catálogo publicado', icon: 'inventory_2', tone: 'slate' },
    { label: 'Pedidos', value: this.portalService.orders().length, hint: 'Órdenes en el sistema', icon: 'shopping_bag', tone: 'gold' }
  ]));

  readonly operationsPulse = computed(() => ([
    { label: 'Alertas críticas', value: this.dashboardService.criticalAlerts().erroresCriticos, hint: 'requieren atención inmediata' },
    { label: 'SOAP hoy', value: this.dashboardService.soapStatus().transaccionesHoy, hint: `respuesta ${this.dashboardService.soapStatus().tiempoRespuesta}` },
    { label: 'Kafka eventos', value: this.dashboardService.kafkaStatus().eventosProcesados, hint: `${this.dashboardService.kafkaStatus().errores} errores registrados` },
    { label: 'Sistema', value: `${this.dashboardService.systemStatus().cpu}%`, hint: `${this.dashboardService.systemStatus().microservicios} servicios monitoreados` }
  ]));

  readonly dashboardHighlights = computed(() => [
    {
      title: 'Ventas del Día',
      value: this.dashboardService.kpis()[4]?.valor ?? 'S/ 0',
      sub: this.dashboardService.kpis()[4]?.tendencia ?? 'Sin variación',
      icon: 'payments'
    },
    {
      title: 'Pedidos Pendientes',
      value: this.dashboardService.criticalAlerts().pedidosPendientes.toString(),
      sub: 'recomendados para priorizar despacho',
      icon: 'hourglass_top'
    },
    {
      title: 'Stock Bajo',
      value: this.dashboardService.criticalAlerts().stockBajo.toString(),
      sub: 'productos por reabastecer',
      icon: 'warning'
    }
  ]);

  // Filter modifiers for specific sections
  readonly logFilterLevel = signal<string>('ALL');
  readonly logFilterModule = signal<string>('ALL');
  readonly orderFilterStatus = signal<string>('ALL');
  readonly paymentFilterStatus = signal<string>('ALL');

  // Selected Entities (Detail Drawers)
  readonly selectedUserId = signal<number | null>(null);
  readonly selectedRoleId = signal<number | null>(null);
  readonly selectedVendorId = signal<number | null>(null);
  readonly productsVendorFilterId = signal<number | null>(null);
  readonly selectedCategoryId = signal<number | null>(null);
  readonly selectedProductId = signal<number | null>(null);
  readonly selectedOrderId = signal<number | null>(null);
  readonly selectedPaymentId = signal<number | null>(null);
  readonly selectedChatId = signal<number | null>(null);
  readonly selectedSoapLogId = signal<number | null>(null);
  readonly deleteConfirm = signal<{ type: 'user' | 'vendor' | 'category' | 'product'; id: number; message: string } | null>(null);

  // View Forms State (CRUD toggles)
  readonly isCreatingUser = signal(false);
  readonly isEditingUser = signal(false);
  readonly isCreatingRole = signal(false);
  readonly isEditingRole = signal(false);
  readonly isCreatingVendor = signal(false);
  readonly isEditingVendor = signal(false);
  readonly isCreatingCategory = signal(false);
  readonly isEditingCategory = signal(false);
  readonly isCreatingProduct = signal(false);
  readonly isEditingProduct = signal(false);
  readonly isAdjustingInventory = signal(false);
  readonly isCreatingNotification = signal(false);
  readonly isCreatingImport = signal(false);
  readonly isCreatingExport = signal(false);

  // Reactive Form Groups
  userForm!: FormGroup;
  roleForm!: FormGroup;
  vendorForm!: FormGroup;
  categoryForm!: FormGroup;
  productForm!: FormGroup;
  inventoryForm!: FormGroup;
  notificationForm!: FormGroup;
  xmlImportForm!: FormGroup;
  exportForm!: FormGroup;
  settingForm!: FormGroup;

  // Temporary message input for chat details
  readonly chatMessageText = signal('');

  private routerSubscription!: Subscription;
  private queryParamsSubscription!: Subscription;

  constructor() {
    this.initForms();
  }

  ngOnInit(): void {
    // Security check: Redirect to login if user session is not active
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (window.innerWidth <= 1024) {
      this.sidebarCollapsed.set(true);
    }

    this.updateActiveSectionFromUrl();
    this.refreshBackendData();
    
    // Listen to router changes to update sections reactively
    this.routerSubscription = this.router.events.subscribe(() => {
      this.updateActiveSectionFromUrl();
    });

    // Listen to query parameters reactively to filter by store
    this.queryParamsSubscription = this.route.queryParams.subscribe(params => {
      const storeId = params['storeId'];
      if (storeId) {
        this.productsVendorFilterId.set(Number(storeId));
      } else {
        this.productsVendorFilterId.set(null);
      }
    });
  }

  private refreshBackendData(): void {
    this.dashboardService.loadSummary().subscribe();
    this.portalService.loadUsers().subscribe();
    this.portalService.loadRoles().subscribe();
    this.portalService.loadVendors().subscribe();
    this.portalService.loadCategories().subscribe();
    this.portalService.loadProducts().subscribe();
    this.portalService.loadOrders().subscribe();
    this.portalService.loadPayments().subscribe();
    this.portalService.loadSoapLogs().subscribe();
    this.portalService.loadNotifications().subscribe();
    this.portalService.loadChats().subscribe();
    this.portalService.loadImportHistory().subscribe();
    this.portalService.loadExportHistory().subscribe();
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.queryParamsSubscription) {
      this.queryParamsSubscription.unsubscribe();
    }
  }

  private initForms(): void {
    this.userForm = this.fb.group({
      correo: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      roles: [['COMPRADOR'], [Validators.required]],
      estado: [true]
    }, { validators: this.checkPasswords });

    this.roleForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.pattern(/^[A-Z_]+$/)]],
      descripcion: ['', [Validators.required]],
      permisos: [[]]
    });

    this.vendorForm = this.fb.group({
      nombreTienda: ['', [Validators.required]],
      descripcion: ['', [Validators.required]],
      region: ['Cusco', [Validators.required]],
      direccion: ['', [Validators.required]],
      logo: ['https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=100'],
      banner: ['https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600'],
      correoUsuario: ['', [Validators.email]],
      activo: [true]
    });

    this.categoryForm = this.fb.group({
      nombre: ['', [Validators.required]],
      descripcion: ['', [Validators.required]],
      activa: [true]
    });

    this.productForm = this.fb.group({
      nombre: ['', [Validators.required]],
      descripcion: ['', [Validators.required]],
      sku: ['', [Validators.required]],
      categoriaId: [1, [Validators.required]],
      vendedorId: [1, [Validators.required]],
      precio: [10.00, [Validators.required, Validators.min(0.01)]],
      stock: [10, [Validators.required, Validators.min(0)]],
      peso: [0.10, [Validators.required, Validators.min(0.01)]],
      activo: [true],
      imagenes: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300']
    });

    this.inventoryForm = this.fb.group({
      productoId: [null, [Validators.required]],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      tipoMovimiento: ['ENTRADA', [Validators.required]],
      observacion: ['', [Validators.required]]
    });

    this.notificationForm = this.fb.group({
      titulo: ['', [Validators.required]],
      mensaje: ['', [Validators.required]],
      tipo: ['SISTEMA', [Validators.required]],
      destinatarios: ['TODOS', [Validators.required]]
    });

    this.xmlImportForm = this.fb.group({
      fileName: ['catalogo_nuevo.xml', [Validators.required]],
      totalRecords: [15, [Validators.required, Validators.min(1)]],
      errorCount: [0, [Validators.required, Validators.min(0)]]
    });

    this.exportForm = this.fb.group({
      formato: ['JSON', [Validators.required]],
      range: ['ALL', [Validators.required]]
    });

    this.settingForm = this.fb.group({
      marketplaceName: ['MultiMarket Enterprise', [Validators.required]],
      commissionRate: [8.5, [Validators.required, Validators.min(0), Validators.max(100)]],
      soapBankWsdl: ['http://banco-soap.com/payments?wsdl', [Validators.required]],
      kafkaBrokerUrl: ['localhost:9092', [Validators.required]],
      maxLoginAttempts: [5, [Validators.required, Validators.min(1)]],
      maintenanceMode: [false]
    });
  }

  private checkPasswords(group: FormGroup) {
    const pass = group.get('password')?.value;
    const confirmPass = group.get('confirmPassword')?.value;
    return pass === confirmPass ? null : { notSame: true };
  }

  // Synchronize state dynamically from Route URL
  private updateActiveSectionFromUrl(): void {
    const url = this.router.url;
    let parsedSection = 'dashboard';
    
    if (url.includes('/admin/users')) parsedSection = 'usuarios';
    else if (url.includes('/admin/roles')) parsedSection = 'roles';
    else if (url.includes('/admin/vendors') || url.includes('/admin/stores')) parsedSection = 'vendedores';
    else if (url.includes('/admin/categories')) parsedSection = 'categorias';
    else if (url.includes('/admin/products')) parsedSection = 'productos';
    else if (url.includes('/admin/inventory')) parsedSection = 'inventario';
    else if (url.includes('/admin/orders')) parsedSection = 'pedidos';
    else if (url.includes('/admin/payments')) parsedSection = 'pagos';
    else if (url.includes('/admin/chats')) parsedSection = 'chats';
    else if (url.includes('/admin/notifications')) parsedSection = 'notificaciones';
    else if (url.includes('/admin/imports')) parsedSection = 'importaciones';
    else if (url.includes('/admin/exports')) parsedSection = 'exportaciones';
    else if (url.includes('/admin/kafka')) parsedSection = 'kafka';
    else if (url.includes('/admin/logs')) parsedSection = 'logs';
    else if (url.includes('/admin/services')) parsedSection = 'servicios';
    else if (url.includes('/admin/settings')) parsedSection = 'configuracion';

    if (this.activeSection() !== parsedSection) {
      this.isLoading.set(true);
      // Clean previous query filters and selections
      this.searchQuery.set('');
      this.currentPage.set(1);
      this.selectedUserId.set(null);
      this.selectedRoleId.set(null);
      this.selectedVendorId.set(null);
      if (parsedSection !== 'productos') {
        this.productsVendorFilterId.set(null);
      }
      this.selectedCategoryId.set(null);
      this.selectedProductId.set(null);
      this.selectedOrderId.set(null);
      this.selectedPaymentId.set(null);
      this.selectedChatId.set(null);
      this.selectedSoapLogId.set(null);
      this.resetAllFormToggles();

      setTimeout(() => {
        this.isLoading.set(false);
      }, 350); // Fast micro-loader transition for premium UX
    }

    this.activeSection.set(parsedSection);
  }

  protected resetAllFormToggles(): void {
    this.isCreatingUser.set(false);
    this.isEditingUser.set(false);
    this.isCreatingRole.set(false);
    this.isEditingRole.set(false);
    this.isCreatingVendor.set(false);
    this.isEditingVendor.set(false);
    this.isCreatingCategory.set(false);
    this.isEditingCategory.set(false);
    this.isCreatingProduct.set(false);
    this.isEditingProduct.set(false);
    this.isAdjustingInventory.set(false);
    this.isCreatingNotification.set(false);
    this.isCreatingImport.set(false);
    this.isCreatingExport.set(false);
  }

  // Sidebar navigation mapping to actual angular paths
  selectSection(sectionId: string): void {
    let routePath = 'dashboard';
    
    if (sectionId === 'usuarios') routePath = 'users';
    else if (sectionId === 'roles') routePath = 'roles';
    else if (sectionId === 'vendedores' || sectionId === 'tiendas') routePath = 'vendors';
    else if (sectionId === 'categorias') routePath = 'categories';
    else if (sectionId === 'productos') routePath = 'products';
    else if (sectionId === 'inventario') routePath = 'inventory';
    else if (sectionId === 'pedidos') routePath = 'orders';
    else if (sectionId === 'pagos') routePath = 'payments';
    else if (sectionId === 'chats') routePath = 'chats';
    else if (sectionId === 'notificaciones') routePath = 'notifications';
    else if (sectionId === 'importaciones') routePath = 'imports';
    else if (sectionId === 'exportaciones') routePath = 'exports';
    else if (sectionId === 'kafka') routePath = 'kafka';
    else if (sectionId === 'logs') routePath = 'logs';
    else if (sectionId === 'servicios') routePath = 'services';
    else if (sectionId === 'configuracion') routePath = 'settings';

    this.router.navigate(['/admin/' + routePath]);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(collapsed => !collapsed);
  }

  showToast(message: string, type: 'success' | 'info' | 'error' = 'success'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 4000);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ==========================================
  // In-Memory Search, Sort & Paginate Computeds
  // ==========================================

  // USERS
  readonly filteredUsers = computed(() => {
    let list = this.portalService.users();
    const query = this.searchQuery().toLowerCase();
    
    if (query) {
      list = list.filter(u => u.correo.toLowerCase().includes(query) || u.roles.join(' ').toLowerCase().includes(query));
    }
    
    const sort = this.sortBy();
    const asc = this.sortAsc();
    return [...list].sort((a: any, b: any) => {
      const valA = a[sort];
      const valB = b[sort];
      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
      return 0;
    });
  });

  readonly selectedUser = computed(() => {
    const id = this.selectedUserId();
    return this.portalService.users().find(u => u.id === id) || null;
  });

  // ROLES
  readonly filteredRoles = computed(() => {
    let list = this.portalService.roles();
    const query = this.searchQuery().toLowerCase();
    
    if (query) {
      list = list.filter(r => r.nombre.toLowerCase().includes(query) || r.descripcion.toLowerCase().includes(query));
    }
    return [...list].sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  readonly selectedRole = computed(() => {
    const id = this.selectedRoleId();
    return this.portalService.roles().find(r => r.id === id) || null;
  });

  // VENDORS
  readonly filteredVendors = computed(() => {
    let list = this.portalService.vendors();
    const query = this.searchQuery().toLowerCase();
    
    if (query) {
      list = list.filter(v => v.nombreTienda.toLowerCase().includes(query) || v.region.toLowerCase().includes(query));
    }
    return [...list].sort((a, b) => a.nombreTienda.localeCompare(b.nombreTienda));
  });

  readonly selectedVendor = computed(() => {
    const id = this.selectedVendorId();
    return this.portalService.vendors().find(v => v.id === id) || null;
  });

  readonly selectedVendorProducts = computed(() => {
    const vendorId = this.selectedVendorId();
    if (!vendorId) return [];
    return this.portalService.products().filter(p => p.vendedorId === vendorId);
  });

  readonly selectedProductsVendor = computed(() => {
    const id = this.productsVendorFilterId();
    return this.portalService.vendors().find(v => v.id === id) || null;
  });

  // CATEGORIES
  readonly filteredCategories = computed(() => {
    let list = this.portalService.categories();
    const query = this.searchQuery().toLowerCase();
    
    if (query) {
      list = list.filter(c => c.nombre.toLowerCase().includes(query) || c.descripcion.toLowerCase().includes(query));
    }
    return [...list].sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  readonly selectedCategory = computed(() => {
    const id = this.selectedCategoryId();
    return this.portalService.categories().find(c => c.id === id) || null;
  });

  // PRODUCTS
  readonly filteredProducts = computed(() => {
    let list = this.portalService.products();
    
    // Map Category and Vendor Names dynamically first
    const mapped = list.map(p => {
      const catId = p.categoriaId != null ? Number(p.categoriaId) : null;
      const vendId = p.vendedorId != null ? Number(p.vendedorId) : null;
      
      const cat = this.portalService.categories().find(c => Number(c.id) === catId);
      const vend = this.portalService.vendors().find(v => Number(v.id) === vendId);
      return {
        ...p,
        categoriaId: catId ?? p.categoriaId,
        vendedorId: vendId ?? p.vendedorId,
        categoriaNombre: cat ? cat.nombre : (p.categoriaNombre || 'Sin Categoría'),
        vendedorNombre: vend ? vend.nombreTienda : (p.vendedorNombre || 'Sin Vendedor')
      };
    });

    let result = mapped;

    const vendorFilterId = this.productsVendorFilterId();
    if (vendorFilterId) {
      result = result.filter(p => Number(p.vendedorId) === Number(vendorFilterId));
    }

    // Default sort alphabetically
    result = [...result].sort((a, b) => a.nombre.localeCompare(b.nombre));

    const query = this.searchQuery().toLowerCase();
    if (query) {
      result = result.filter(p => 
        p.nombre.toLowerCase().includes(query) || 
        p.sku.toLowerCase().includes(query) ||
        p.vendedorNombre.toLowerCase().includes(query) ||
        p.categoriaNombre.toLowerCase().includes(query)
      );
      result = result.slice(0, 2); // limit to 2 options
    }
    return result;
  });

  readonly selectedProduct = computed(() => {
    const id = this.selectedProductId();
    const prod = this.portalService.products().find(p => p.id === id);
    if (!prod) return null;
    
    const catId = prod.categoriaId != null ? Number(prod.categoriaId) : null;
    const vendId = prod.vendedorId != null ? Number(prod.vendedorId) : null;
    
    const cat = this.portalService.categories().find(c => Number(c.id) === catId);
    const vend = this.portalService.vendors().find(v => Number(v.id) === vendId);
    return {
      ...prod,
      categoriaId: catId ?? prod.categoriaId,
      vendedorId: vendId ?? prod.vendedorId,
      categoriaNombre: cat ? cat.nombre : (prod.categoriaNombre || 'Sin Categoría'),
      vendedorNombre: vend ? vend.nombreTienda : (prod.vendedorNombre || 'Sin Vendedor')
    };
  });


  // INVENTORY MOVEMENTS
  readonly filteredInventoryMovements = computed(() => {
    let list = this.portalService.inventoryMovements();
    const query = this.searchQuery().toLowerCase();
    
    if (query) {
      list = list.filter(m => m.productoNombre.toLowerCase().includes(query) || m.tipoMovimiento.toLowerCase().includes(query));
    }
    return [...list].sort((a, b) => b.id - a.id); // Newest first
  });

  // ORDERS
  readonly filteredOrders = computed(() => {
    let list = this.portalService.orders();
    const query = this.searchQuery().toLowerCase();
    const status = this.orderFilterStatus();
    
    if (query) {
      list = list.filter(o => o.numeroPedido.toLowerCase().includes(query) || o.compradorNombre.toLowerCase().includes(query) || o.compradorCorreo.toLowerCase().includes(query));
    }
    if (status !== 'ALL') {
      list = list.filter(o => o.estado === status);
    }
    return [...list].sort((a, b) => b.id - a.id); // Newest first
  });

  readonly selectedOrder = computed(() => {
    const id = this.selectedOrderId();
    return this.portalService.orders().find(o => o.id === id) || null;
  });

  // PAYMENTS
  readonly filteredPayments = computed(() => {
    let list = this.portalService.payments();
    const query = this.searchQuery().toLowerCase();
    const status = this.paymentFilterStatus();
    
    if (query) {
      list = list.filter(p => p.pedidoNumero.toLowerCase().includes(query) || p.codigoOperacion.toLowerCase().includes(query));
    }
    if (status !== 'ALL') {
      list = list.filter(p => p.estadoPago === status);
    }
    return [...list].sort((a, b) => b.id - a.id); // Newest first
  });

  readonly selectedPayment = computed(() => {
    const id = this.selectedPaymentId();
    return this.portalService.payments().find(p => p.id === id) || null;
  });

  // SOAP AUDIT LOGS
  readonly selectedSoapLog = computed(() => {
    const id = this.selectedSoapLogId();
    return this.portalService.soapLogs().find(l => l.id === id) || null;
  });

  // CHATS
  readonly filteredChats = computed(() => {
    let list = this.portalService.chats();
    const query = this.searchQuery().toLowerCase();
    
    if (query) {
      list = list.filter(c => c.compradorCorreo.toLowerCase().includes(query) || c.vendedorNombre.toLowerCase().includes(query));
    }
    return list;
  });

  readonly selectedChat = computed(() => {
    const id = this.selectedChatId();
    return this.portalService.chats().find(c => c.id === id) || null;
  });

  // NOTIFICATIONS
  readonly filteredNotifications = computed(() => {
    let list = this.portalService.notifications();
    const query = this.searchQuery().toLowerCase();
    
    if (query) {
      list = list.filter(n => n.titulo.toLowerCase().includes(query) || n.mensaje.toLowerCase().includes(query));
    }
    return list;
  });

  // XML IMPORTS & EXPORTS
  readonly filteredXmlImports = computed(() => {
    let list = this.portalService.xmlImports();
    const query = this.searchQuery().toLowerCase();
    
    if (query) {
      list = list.filter(x => x.nombreArchivo.toLowerCase().includes(query));
    }
    return list;
  });

  readonly filteredExports = computed(() => {
    let list = this.portalService.exports();
    const query = this.searchQuery().toLowerCase();
    
    if (query) {
      list = list.filter(e => e.formato.toLowerCase().includes(query));
    }
    return list;
  });

  // MONITOREO LOGS
  readonly filteredLogs = computed(() => {
    // Simulating SQL server audit queries
    const activities = this.dashboardService.recentActivities();
    const level = this.logFilterLevel();
    const mod = this.logFilterModule();
    const query = this.searchQuery().toLowerCase();

    let result = activities;

    if (level !== 'ALL') {
      result = result.filter(log => {
        if (level === 'ERROR') return log.resultado === 'ERROR';
        if (level === 'WARN') return log.resultado === 'WARN';
        return log.resultado === 'OK';
      });
    }

    if (mod !== 'ALL') {
      result = result.filter(log => log.modulo === mod);
    }

    if (query) {
      result = result.filter(log => 
        log.usuario.toLowerCase().includes(query) || 
        log.accion.toLowerCase().includes(query)
      );
    }

    return result;
  });

  // ==========================================
  // CRUD Dispatchers and Event Handlers
  // ==========================================

  // 1. USERS CRUD
  openCreateUser(): void {
    this.resetAllFormToggles();
    this.userForm.reset({ roles: ['COMPRADOR'], estado: true });
    this.isCreatingUser.set(true);
  }

  openEditUser(user: AdminUser): void {
    this.resetAllFormToggles();
    this.selectedUserId.set(user.id);
    this.userForm.reset({
      correo: user.correo,
      password: '',
      confirmPassword: '',
      roles: user.roles,
      estado: user.estado
    });
    // Remove validators for password since editing
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('confirmPassword')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.userForm.get('confirmPassword')?.updateValueAndValidity();

    this.isEditingUser.set(true);
  }

  saveUser(): void {
    if (this.isCreatingUser()) {
      if (this.userForm.invalid) {
        this.showToast('Formulario inválido. Verifique los campos.', 'error');
        return;
      }
      this.portalService.addUser(this.userForm.value);
      this.showToast('Usuario administrativo guardado con éxito.', 'success');
    } else if (this.isEditingUser()) {
      const updateData: any = {
        correo: this.userForm.get('correo')?.value,
        roles: this.userForm.get('roles')?.value,
        estado: this.userForm.get('estado')?.value
      };
      
      const pwd = this.userForm.get('password')?.value;
      if (pwd) {
        updateData.password = pwd;
      }

      this.portalService.updateUser(this.selectedUserId()!, updateData);
      this.showToast('Usuario actualizado con éxito en la base de datos.', 'success');
    }
    this.resetAllFormToggles();
  }

  deleteUser(id: number): void {
    this.deleteConfirm.set({
      type: 'user',
      id,
      message: '¿Está seguro de eliminar este usuario de forma permanente de los registros de SQL Server? Esta acción no se puede deshacer.'
    });
  }

  toggleBlockUser(user: AdminUser): void {
    const updatedStatus = !user.bloqueado;
    this.portalService.updateUser(user.id, { bloqueado: updatedStatus, estado: !updatedStatus });
    this.showToast(updatedStatus ? `Usuario ${user.correo} BLOQUEADO por seguridad.` : `Usuario ${user.correo} DESBLOQUEADO.`, 'info');
  }

  // 2. ROLES CRUD
  openCreateRole(): void {
    this.resetAllFormToggles();
    this.roleForm.reset({ permisos: [] });
    this.isCreatingRole.set(true);
  }

  saveRole(): void {
    if (this.roleForm.invalid) {
      this.showToast('Complete los campos obligatorios del Rol.', 'error');
      return;
    }
    this.portalService.addRole(this.roleForm.value);
    this.showToast('Nuevo Rol creado exitosamente.', 'success');
    this.resetAllFormToggles();
  }

  togglePermission(perm: string): void {
    const current = this.roleForm.get('permisos')?.value as string[] || [];
    if (current.includes(perm)) {
      this.roleForm.patchValue({ permisos: current.filter(p => p !== perm) });
    } else {
      this.roleForm.patchValue({ permisos: [...current, perm] });
    }
  }

  isPermissionSelected(perm: string): boolean {
    const current = this.roleForm.get('permisos')?.value as string[] || [];
    return current.includes(perm);
  }

  // 3. VENDORS CRUD
  openCreateVendor(): void {
    this.resetAllFormToggles();
    this.vendorViewMode.set('list');
    this.vendorForm.reset({ region: 'Cusco', activo: true });
    this.isCreatingVendor.set(true);
  }

  openEditVendor(vendor: AdminVendor): void {
    this.resetAllFormToggles();
    this.vendorViewMode.set('list');
    this.selectedVendorId.set(vendor.id);
    this.vendorForm.reset({
      nombreTienda: vendor.nombreTienda,
      descripcion: vendor.descripcion,
      region: vendor.region,
      direccion: vendor.direccion,
      logo: vendor.logo,
      banner: vendor.banner,
      activo: vendor.activo
    });
    this.isEditingVendor.set(true);
  }

  saveVendor(): void {
    if (this.vendorForm.invalid) {
      this.showToast('Formulario inválido. Verifique los campos obligatorios del Vendedor.', 'error');
      return;
    }
    
    if (this.isCreatingVendor()) {
      const correo = this.vendorForm.get('correoUsuario')?.value;
      if (!correo || !correo.trim()) {
        this.showToast('El correo electrónico del vendedor es obligatorio para el registro.', 'error');
        return;
      }

      this.portalService.addVendor(this.vendorForm.value).subscribe({
        next: () => {
          this.showToast('Vendedor regional registrado con éxito.', 'success');
          this.resetAllFormToggles();
        },
        error: (err) => {
          console.error(err);
          this.showToast('Error al registrar el vendedor. Verifique si el correo existe y tiene rol VENDEDOR, o si ya tiene tienda.', 'error');
        }
      });
    } else {
      this.portalService.updateVendor(this.selectedVendorId()!, this.vendorForm.value).subscribe({
        next: () => {
          this.showToast('Datos de la tienda del vendedor actualizados.', 'success');
          this.resetAllFormToggles();
        },
        error: (err) => {
          console.error(err);
          this.showToast('Error al actualizar los datos de la tienda.', 'error');
        }
      });
    }
  }

  deleteVendor(id: number): void {
    this.deleteConfirm.set({
      type: 'vendor',
      id,
      message: '¿Dar de baja a este vendedor? Esto desactivará su catálogo y detendrá sus operaciones comerciales en la plataforma.'
    });
  }

  // 3b. STORES (TIENDAS) HELPERS
  getStoreProductCount(vendorId: number): number {
    return this.portalService.products().filter(p => p.vendedorId === vendorId).length;
  }

  viewVendorProducts(vendor: AdminVendor): void {
    this.searchQuery.set('');
    this.router.navigate(['/admin/products'], { queryParams: { storeId: vendor.id } });
  }

  clearVendorFilter(): void {
    this.router.navigate(['/admin/products']);
  }

  toggleVendorActive(vendor: AdminVendor): void {
    const updatedStatus = !vendor.activo;
    this.portalService.updateVendor(vendor.id, { ...vendor, activo: updatedStatus }).subscribe({
      next: () => {
        this.showToast(`Tienda "${vendor.nombreTienda}" ${updatedStatus ? 'Habilitada' : 'Suspendida'} con éxito.`, 'info');
      },
      error: (err) => {
        console.error(err);
        this.showToast('Error al cambiar el estado de la tienda.', 'error');
      }
    });
  }

  // 4. CATEGORIES CRUD
  openCreateCategory(): void {
    this.resetAllFormToggles();
    this.categoryForm.reset({ activa: true });
    this.isCreatingCategory.set(true);
  }

  openEditCategory(cat: AdminCategory): void {
    this.resetAllFormToggles();
    this.selectedCategoryId.set(cat.id);
    this.categoryForm.reset({
      nombre: cat.nombre,
      descripcion: cat.descripcion,
      activa: cat.activa
    });
    this.isEditingCategory.set(true);
  }

  saveCategory(): void {
    if (this.categoryForm.invalid) {
      this.showToast('Verifique el nombre y descripción de la categoría.', 'error');
      return;
    }

    if (this.isCreatingCategory()) {
      this.portalService.addCategory(this.categoryForm.value).subscribe({
        next: () => {
          this.showToast('Categoría creada satisfactoriamente.', 'success');
          this.resetAllFormToggles();
        },
        error: (err) => {
          this.showToast(err.error?.message || err.message || 'Error al crear la categoría.', 'error');
        }
      });
    } else {
      this.portalService.updateCategory(this.selectedCategoryId()!, this.categoryForm.value).subscribe({
        next: () => {
          this.showToast('Categoría actualizada con éxito.', 'success');
          this.resetAllFormToggles();
        },
        error: (err) => {
          this.showToast(err.error?.message || err.message || 'Error al actualizar la categoría.', 'error');
        }
      });
    }
  }


  deleteCategory(id: number): void {
    this.deleteConfirm.set({
      type: 'category',
      id,
      message: '¿Está seguro de eliminar esta categoría? Esto podría afectar la clasificación de los productos asociados.'
    });
  }

  // 5. PRODUCTS CRUD
  openCreateProduct(): void {
    this.resetAllFormToggles();
    const currentStoreId = this.productsVendorFilterId();
    this.productForm.reset({
      categoriaId: this.portalService.categories()[0]?.id || 1,
      vendedorId: currentStoreId || this.portalService.vendors()[0]?.id || 1,
      precio: 10.0,
      stock: 10,
      peso: 0.20,
      activo: true,
      imagenes: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300'
    });
    this.isCreatingProduct.set(true);
  }


  openEditProduct(p: AdminProduct): void {
    this.resetAllFormToggles();
    this.selectedProductId.set(p.id);
    this.productForm.reset({
      nombre: p.nombre,
      descripcion: p.descripcion,
      sku: p.sku,
      categoriaId: p.categoriaId,
      vendedorId: p.vendedorId,
      precio: p.precio,
      stock: p.stock,
      peso: p.peso,
      activo: p.activo,
      imagenes: p.imagenes[0]
    });
    this.isEditingProduct.set(true);
  }

  saveProduct(): void {
    if (this.productForm.invalid) {
      this.showToast('Formulario inválido. Verifique precios, stock y SKU.', 'error');
      return;
    }

    const payload = {
      ...this.productForm.value,
      imagenes: [this.productForm.value.imagenes]
    };

    if (this.isCreatingProduct()) {
      this.portalService.addProduct(payload).subscribe({
        next: () => {
          this.showToast('Producto publicado. Persistido en el backend.', 'success');
          this.resetAllFormToggles();
        },
        error: (err) => {
          this.showToast(err.error?.message || err.message || 'Error al publicar producto.', 'error');
        }
      });
    } else {
      this.portalService.updateProduct(this.selectedProductId()!, payload).subscribe({
        next: () => {
          this.showToast('Detalles del producto actualizados en SQL Server.', 'success');
          this.resetAllFormToggles();
        },
        error: (err) => {
          this.showToast(err.error?.message || err.message || 'Error al actualizar producto.', 'error');
        }
      });
    }
  }


  deleteProduct(id: number): void {
    this.deleteConfirm.set({
      type: 'product',
      id,
      message: '¿Dar de baja a este producto? El stock quedará inhabilitado para la venta en la tienda de forma permanente.'
    });
  }

  confirmDelete(): void {
    const data = this.deleteConfirm();
    if (!data) return;

    this.deleteConfirm.set(null); // Close modal

    if (data.type === 'user') {
      this.portalService.deleteUser(data.id);
      this.showToast('Usuario removido de los registros de SQL Server.', 'success');
    } else if (data.type === 'vendor') {
      this.portalService.deleteVendor(data.id).subscribe({
        next: () => {
          this.showToast('Vendedor desactivado con éxito.', 'success');
        },
        error: (err) => {
          console.error(err);
          this.showToast('Error al desactivar el vendedor.', 'error');
        }
      });
    } else if (data.type === 'category') {
      this.portalService.deleteCategory(data.id).subscribe(() => {
        this.showToast('Categoría eliminada del catálogo.', 'success');
      });
    } else if (data.type === 'product') {
      this.portalService.deleteProduct(data.id).subscribe(() => {
        this.showToast('Producto eliminado del marketplace.', 'success');
      });
    }
  }

  // 6. INVENTORY ADJUSTMENTS
  openAdjustInventory(): void {
    this.resetAllFormToggles();
    this.inventoryForm.reset({
      productoId: this.portalService.products()[0]?.id || null,
      cantidad: 1,
      tipoMovimiento: 'ENTRADA',
      observacion: ''
    });
    this.isAdjustingInventory.set(true);
  }

  saveInventoryAdjustment(): void {
    if (this.inventoryForm.invalid) {
      this.showToast('Complete la cantidad y una justificación válida.', 'error');
      return;
    }
    
    const formVals = this.inventoryForm.value;
    this.portalService.adjustInventory(
      Number(formVals.productoId),
      formVals.cantidad,
      formVals.tipoMovimiento,
      formVals.observacion
    );
    this.showToast('Stock de producto modificado y registrado en kárdex.', 'success');
    this.resetAllFormToggles();
  }

  // 7. ORDERS MANAGEMENT
  updateOrderStatus(orderId: number, status: 'PENDIENTE' | 'PAGADO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO'): void {
    this.portalService.updateOrderStatus(orderId, status);
    this.showToast(`Estado de pedido actualizado a: ${status}`, 'success');
  }

  // 8. PAYMENTS AND SOAP
  retryPayment(pay: AdminPayment): void {
    this.showToast(`Conectando con Servicio SOAP Banco para transaccionar: ${pay.pedidoNumero}...`, 'info');
    this.portalService.retrySoapPayment(pay.id).subscribe(msg => {
      this.showToast(msg, 'success');
    });
  }

  // 9. MESSAGING CHATS INTERACTIVE SYSTEM
  sendMessage(): void {
    const text = this.chatMessageText().trim();
    const chatId = this.selectedChatId();
    if (!text || !chatId) return;

    const chatObj = this.portalService.chats().find(c => c.id === chatId);
    if (!chatObj) return;

    chatObj.mensajes.push({
      remitente: 'admin@multimarket.com',
      contenido: text,
      fecha: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    });
    chatObj.ultimoMensaje = text;
    this.chatMessageText.set('');
    this.showToast('Respuesta enviada de forma interactiva.', 'success');
  }

  // 10. NOTIFICATIONS
  openCreateNotification(): void {
    this.resetAllFormToggles();
    this.notificationForm.reset({ tipo: 'SISTEMA', destinatarios: 'TODOS' });
    this.isCreatingNotification.set(true);
  }

  sendNotification(): void {
    if (this.notificationForm.invalid) {
      this.showToast('Complete el título y cuerpo de la notificación.', 'error');
      return;
    }
    this.portalService.addNotification(this.notificationForm.value);
    this.showToast('Notificación global distribuida a destinatarios.', 'success');
    this.resetAllFormToggles();
  }

  // 11. XML IMPORTS
  openCreateImport(): void {
    this.resetAllFormToggles();
    this.xmlImportForm.reset({ fileName: 'catalogo_cusco_final.xml', totalRecords: 12, errorCount: 0 });
    this.isCreatingImport.set(true);
  }

  processXmlImport(): void {
    if (this.xmlImportForm.invalid) {
      this.showToast('Ingrese un nombre de archivo .xml válido.', 'error');
      return;
    }

    const val = this.xmlImportForm.value;
    this.portalService.uploadCatalogXmlSimulation(val.fileName, val.totalRecords, val.errorCount).subscribe({
      next: (msg) => {
        this.showToast(msg, 'success');
        this.resetAllFormToggles();
      },
      error: (err) => {
        this.showToast(err.error?.message || err.message || 'Error al procesar la importación XML.', 'error');
      }
    });
  }


  // 12. EXPORTS
  openCreateExport(): void {
    this.resetAllFormToggles();
    this.exportForm.reset({ formato: 'JSON', range: 'ALL' });
    this.isCreatingExport.set(true);
  }

  triggerCatalogExport(): void {
    const val = this.exportForm.value;
    this.portalService.exportCatalogSimulation(val.formato).subscribe({
      next: (msg) => {
        this.showToast(msg, 'success');
        this.resetAllFormToggles();
      },
      error: (err) => {
        this.showToast(err.error?.message || err.message || 'Error al generar la exportación.', 'error');
      }
    });
  }


  // 13. SETTINGS
  saveSettings(): void {
    if (this.settingForm.invalid) {
      this.showToast('Complete correctamente la configuración del sistema.', 'error');
      return;
    }
    this.showToast('Configuraciones generales de la plataforma y microservicios guardadas.', 'success');
  }

  // ==========================================
  // EXCEL / CSV EXPORTERS Dispatchers
  // ==========================================
  exportUsersCsv(): void {
    this.portalService.exportToCsv(this.portalService.users(), 'MultiMarket_Usuarios');
    this.showToast('Listado de usuarios exportado a CSV.', 'success');
  }

  exportProductsCsv(): void {
    this.portalService.exportToCsv(this.portalService.products(), 'MultiMarket_Productos');
    this.showToast('Catálogo de productos exportado a CSV.', 'success');
  }

  exportOrdersCsv(): void {
    this.portalService.exportToCsv(this.portalService.orders(), 'MultiMarket_Pedidos');
    this.showToast('Libro de pedidos exportado a CSV.', 'success');
  }

  exportPaymentsCsv(): void {
    this.portalService.exportToCsv(this.portalService.payments(), 'MultiMarket_Pagos');
    this.showToast('Registro de cobros SOAP exportado a CSV.', 'success');
  }
}
