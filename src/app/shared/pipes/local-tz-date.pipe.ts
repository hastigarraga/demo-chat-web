import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'localTz', standalone: true })
export class LocalTzDatePipe implements PipeTransform {
  private tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  transform(
    value: string | number | Date | null | undefined,
    format: string = 'dd/MM/yyyy HH:mm',
    tz: string = this.tz
  ): string {
    if (value == null) return '';
    const date = value instanceof Date ? value : new Date(value);

    // Usamos formatToParts para respetar la zona horaria sin librerías extra
    const parts = new Intl.DateTimeFormat('es-AR', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    // Asegura cero-padding
    const dd = pad(map.day);
    const MM = pad(map.month);
    const yyyy = map.year;
    const HH = pad(map.hour);
    const mm = pad(map.minute);

    // Soporta solo el patrón usado en la app (evitamos “inventos”)
    if (format === 'dd/MM/yyyy HH:mm') {
      return `${dd}/${MM}/${yyyy} ${HH}:${mm}`;
    }
    // Fallback simple
    return `${dd}/${MM}/${yyyy} ${HH}:${mm}`;
  }
}

function pad(v?: string) {
  const s = (v ?? '').padStart(2, '0');
  return s.length > 2 ? s.slice(-2) : s;
}
