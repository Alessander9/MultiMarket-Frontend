import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SellerService, XmlImportLog } from '../../../services/seller.service';

@Component({
  selector: 'app-seller-imports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './imports.html',
  styleUrl: './imports.css'
})
export class SellerImports {
  protected readonly sellerService = inject(SellerService);

  readonly isUploading = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly uploadFeedback = signal<string | null>(null);
  readonly uploadError = signal<string | null>(null);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.name.endsWith('.xml')) {
        this.selectedFile.set(file);
        this.uploadError.set(null);
      } else {
        this.selectedFile.set(null);
        this.uploadError.set('Por favor, seleccione únicamente archivos en formato .xml');
      }
    }
  }

  triggerUpload(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.isUploading.set(true);
    this.uploadFeedback.set('Procesando esquema XML y validando duplicados de SKU...');
    this.uploadError.set(null);

    this.sellerService.importCatalogXmlFile(file).subscribe({
      next: (log) => {
        this.isUploading.set(false);
        this.selectedFile.set(null);
        this.uploadFeedback.set(null);
        
        if (log.estado === 'EXITOSO') {
          alert(`¡Éxito! Archivo ${log.archivoNombre} procesado. Se importaron ${log.registrosCreados} nuevos productos.`);
        } else {
          alert(`Advertencia: Archivo procesado con errores. Creados: ${log.registrosCreados}, Fallidos: ${log.registrosFallidos}. Revisa el historial para ver detalles.`);
        }
      },
      error: () => {
        this.isUploading.set(false);
        this.uploadFeedback.set(null);
        this.uploadError.set('Error en la conexión SOAP/REST con el servidor durante la validación del esquema.');
      }
    });
  }
}
