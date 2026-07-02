import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'paginate',
  standalone: true,
  pure: true
})
export class PaginatePipe implements PipeTransform {
  transform<T>(items: T[] | null | undefined, currentPage: number, pageSize: number): T[] {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const safePage = Math.max(1, Number(currentPage) || 1);
    const safePageSize = Math.max(1, Number(pageSize) || 10);
    const start = (safePage - 1) * safePageSize;
    return items.slice(start, start + safePageSize);
  }
}
