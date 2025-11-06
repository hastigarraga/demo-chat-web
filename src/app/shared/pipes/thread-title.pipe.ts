import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'threadTitle', standalone: true })
export class ThreadTitlePipe implements PipeTransform {
  transform(t: any, max = 60): string {
    const explicit = (t?.title || '').trim();
    if (explicit) return explicit.length > max ? explicit.slice(0, max) + '…' : explicit;

    const firstUser = (t?.messages || []).find(
      (m: any) => m?.role === 'user' && typeof m?.content === 'string' && m.content.trim()
    );
    const txt = (firstUser?.content || 'Nuevo chat').trim();
    return txt.length > max ? txt.slice(0, max) + '…' : txt;
  }
}
