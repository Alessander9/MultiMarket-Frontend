import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SellerService, ExportLog } from '../../../services/seller.service';

@Component({
  selector: 'app-seller-exports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './exports.html',
  styleUrl: './exports.css'
})
export class SellerExports {
  protected readonly sellerService = inject(SellerService);

  readonly isGenerating = signal(false);
  readonly selectedFormat = signal<'JSON' | 'XML'>('JSON');

  triggerExport(): void {
    const format = this.selectedFormat();
    this.isGenerating.set(true);

    this.sellerService.exportCatalogData(format).subscribe({
      next: (log) => {
        this.isGenerating.set(false);
        alert(`¡Catálogo exportado con éxito! Archivo "${log.archivoNombre}" listo para descargar.`);
      },
      error: () => {
        this.isGenerating.set(false);
        alert('Error al generar la exportación.');
      }
    });
  }

  downloadFile(fileName: string): void {
    alert(`Descargando el archivo: ${fileName}`);
    // Future integration: trigger browser download of static files
  }
}
