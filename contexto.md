# Contexto del Proyecto MultiMarketFrontend

## Visión General
El proyecto **MultiMarketFrontend** es una aplicación web SPA (Single Page Application) desarrollada con **Angular**. Corresponde a la parte frontal de un sistema tipo "MultiMarket" (probablemente un marketplace con múltiples roles).

## Tecnologías Principales
- **Angular:** Versión `^21.2.0`.
- **TypeScript:** Versión `~5.9.2`.
- **RxJS:** Versión `~7.8.0`.
- **Node Package Manager (npm):** Configurado para usar la versión `11.12.1`.
- **Testing:** Configurado con `vitest`, `playwright` y `jsdom`.

## Estructura del Proyecto

La estructura principal del proyecto es la estándar de Angular, con algunas particularidades en el código fuente (`src/app/`):

- **`src/app/components/`**: Contiene los componentes de la interfaz de usuario agrupados por módulos o roles:
  - `admin/`: Componentes para la interfaz de administración.
  - `customer/`: Componentes para los clientes/compradores.
  - `seller/`: Componentes para los vendedores.
  - `login/`: Componentes para la autenticación e inicio de sesión.
  - `productos/`: Componentes relacionados con el catálogo o visualización de productos.

- **`src/app/services/`**: Contiene los servicios de Angular encargados de la lógica de negocio y las llamadas a la API. Destacan:
  - Servicios de roles: `admin-portal.service.ts`, `customer.service.ts`, `seller.service.ts`, `admin-dashboard.service.ts`.
  - Servicios de negocio: `product.service.ts`, `order.service.ts`, `chat.service.ts`.
  - Servicios transversales: `auth.service.ts` (autenticación), `theme.service.ts` (temas).

- **`src/app/shared/`**: Recursos compartidos entre diferentes módulos.
  - `pagination-controls/`: Probablemente componentes o lógicas para paginación.
  - `pipes/`: Pipes personalizados de Angular.

- **`src/app/guards/` & `src/app/interceptors/`**: Contienen lógicas de protección de rutas (guards) e interceptores HTTP (para añadir tokens JWT, manejar errores globales, etc.).

## Scripts Disponibles (en `package.json`)
- `ng start` / `npm start`: Inicia el servidor de desarrollo local (`ng serve`).
- `ng build` / `npm run build`: Compila la aplicación para producción.
- `ng test` / `npm run test`: Ejecuta las pruebas unitarias.
- `npm run watch`: Compila en modo desarrollo con recarga automática.
- `npm run qa:theme` y `npm run qa:full`: Scripts personalizados de aseguramiento de calidad.

## Configuración y Estilos
- El archivo `angular.json` define la configuración del workspace. 
- Los estilos globales se encuentran en `src/styles.css` y `src/app/app.css`.
- Los archivos estáticos se almacenan en los directorios `public/` y `img/`.

## Resumen Arquitectónico
La aplicación parece estar estructurada siguiendo un modelo orientado a roles (`admin`, `customer`, `seller`). Utiliza un enfoque modular (aunque basado en standalone components o un módulo principal `app` ya que estamos en Angular v21+). Cada rol tiene sus propios componentes e interfaces, sustentados por un servicio dedicado (por ejemplo, `seller.service.ts`) para interactuar con el backend correspondiente.
