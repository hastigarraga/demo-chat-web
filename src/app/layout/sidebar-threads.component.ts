// src/app/layout/sidebar-threads.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

type Thread = { _id: string; title: string };

@Component({
  standalone: true,
  selector: 'app-sidebar-threads',
  imports: [CommonModule],
  template: `
    <aside class="sidebar" role="complementary" aria-label="Hilos">
      <header class="sidebar__header">
        <button type="button" class="btn btn-primary" (click)="create.emit()" [disabled]="busy" aria-label="Nuevo chat">
          <span aria-hidden="true">＋</span> Nuevo chat
        </button>
      </header>

      <nav class="threads" role="listbox" aria-label="Lista de hilos">
        <div
          *ngFor="let t of threads; trackBy: trackById"
          class="thread"
          [class.thread--active]="t._id === selectedId"
          (click)="select.emit(t._id)"
          (keydown)="onRowKeydown($event, t._id)"
          tabindex="0"
          role="option"
          [attr.aria-selected]="t._id === selectedId"
        >
          <div class="thread__title" [title]="t.title">{{ t.title || 'Nuevo chat' }}</div>
          <div class="thread__buttons">
            <button type="button" class="btn btn-ghost" (click)="emitRename($event, t._id)" [disabled]="busy" aria-label="Renombrar hilo">✎</button>
            <button type="button" class="btn btn-ghost" (click)="emitRemove($event, t._id)" [disabled]="busy" aria-label="Eliminar hilo">🗑</button>
          </div>
        </div>

        <div *ngIf="!threads?.length" class="empty">Sin hilos. Creá uno nuevo para empezar.</div>
      </nav>
    </aside>
  `,
  styles: [`
    .sidebar { width:100%; height:100%; display:flex; flex-direction:column; background:var(--bg-elev); }
    .sidebar__header{ padding:1rem; border-bottom:1px solid var(--border); }
    .threads { padding:.5rem; overflow:auto; display:flex; flex-direction:column; gap:.35rem; }
    .thread { display:flex; align-items:center; justify-content:space-between; gap:.5rem; padding:.7rem .8rem; border-radius:.7rem; border:1px solid transparent; cursor:pointer; }
    .thread:hover{ background:rgba(148,163,184,.08); }
    .thread--active{ background:rgba(59,130,246,.12); border-color:rgba(59,130,246,.35); }
    .thread__title{ font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 210px; }
    .thread__buttons{ display:flex; gap:.25rem; }
    .btn-ghost{ background:transparent; border-color:transparent; color:var(--text); }
    .empty{ padding:1rem; color:var(--muted); }
  `]
})
export class SidebarThreads {
  @Input() threads: Thread[] = [];
  @Input() selectedId: string | null = null;
  @Input() busy = false;
  @Output() select = new EventEmitter<string>();
  @Output() create = new EventEmitter<void>();
  @Output() rename = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();

  trackById = (_: number, t: Thread) => t._id;

  emitRename(event: Event, id: string) { event.stopPropagation(); this.rename.emit(id); }
  emitRemove(event: Event, id: string) { event.stopPropagation(); this.remove.emit(id); }
  onRowKeydown(event: KeyboardEvent, id: string) {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.select.emit(id); }
  }
}
