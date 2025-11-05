import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

type Thread = { _id: string; title: string };

@Component({
  standalone: true,
  selector: 'app-sidebar-threads',
  imports: [CommonModule],
  template: `
    <aside class="sidebar">
      <header class="sidebar__header">
        <div class="sidebar__actions">
          <button type="button" class="btn btn-primary" (click)="create.emit()" [disabled]="busy">
            <span aria-hidden="true">＋</span>
            Nuevo chat
          </button>
          <button type="button" class="btn btn-muted" (click)="logout.emit()" [disabled]="busy">
            Cerrar sesión
          </button>
        </div>
        <p class="sidebar__hint text-dimmed">
          Tus conversaciones se guardan automáticamente.
        </p>
      </header>

      <p class="sidebar__empty" *ngIf="!threads.length && !busy">
        No hay conversaciones todavía.
      </p>

      <ul class="sidebar__list">
        <li
          class="thread"
          *ngFor="let t of threads"
          [class.thread--selected]="t._id === selected"
        >
          <div
            class="thread__container"
            role="button"
            tabindex="0"
            [attr.aria-pressed]="t._id === selected"
            (click)="select.emit(t._id)"
            (keydown)="onRowKeydown($event, t._id)"
          >
            <div class="thread__title">{{ t.title || 'Sin título' }}</div>
            <div class="thread__buttons">
              <button
                type="button"
                class="btn-icon"
                title="Renombrar hilo"
                (click)="emitRename($event, t._id)"
                [disabled]="busy"
              >
                ✎
              </button>
              <button
                type="button"
                class="btn-icon"
                title="Eliminar hilo"
                (click)="emitRemove($event, t._id)"
                [disabled]="busy"
              >
                🗑
              </button>
            </div>
          </div>
        </li>
      </ul>
    </aside>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .sidebar {
        width: 300px;
        height: 100%;
        padding: 1.5rem 1.25rem 1.5rem 1.75rem;
        border-right: 1px solid rgba(203, 213, 225, 0.9);
        background: linear-gradient(180deg, #ffffff, #f1f5f9);
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        overflow-y: auto;
      }

      .sidebar__header {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .sidebar__actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .sidebar__hint {
        font-size: 0.85rem;
        margin: 0;
      }

      .sidebar__empty {
        margin: 0;
        padding: 0.75rem 1rem;
        border-radius: 1rem;
        background: rgba(226, 232, 240, 0.35);
        color: rgba(71, 85, 105, 0.85);
        border: 1px dashed rgba(148, 163, 184, 0.45);
      }

      .sidebar__list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .thread {
        border-radius: 1rem;
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(226, 232, 240, 0.9);
        transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;
      }

      .thread--selected {
        border-color: rgba(37, 99, 235, 0.5);
        background: rgba(219, 234, 254, 0.85);
        box-shadow: 0 12px 24px rgba(37, 99, 235, 0.15);
      }

      .thread__container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.85rem 1rem;
        cursor: pointer;
      }

      .thread__container:focus-visible {
        outline: 2px solid rgba(14, 165, 233, 0.75);
        outline-offset: 3px;
      }

      .thread__title {
        font-weight: 600;
        font-size: 0.95rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .thread__buttons {
        display: inline-flex;
        gap: 0.35rem;
      }

      .btn-icon {
        font-size: 0.9rem;
        color: #1e293b;
      }

      .btn-icon:focus-visible {
        outline: 2px solid rgba(14, 165, 233, 0.65);
        outline-offset: 3px;
      }
    `,
  ],
})
export class SidebarThreads {
  @Input() threads: Thread[] = [];
  @Input() selected: string | null = null;
  @Input() busy = false;
  @Output() select = new EventEmitter<string>();
  @Output() create = new EventEmitter<void>();
  @Output() rename = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();
  @Output() logout = new EventEmitter<void>();

  emitRename(event: Event, id: string) {
    event.stopPropagation();
    this.rename.emit(id);
  }

  emitRemove(event: Event, id: string) {
    event.stopPropagation();
    this.remove.emit(id);
  }

  onRowKeydown(event: KeyboardEvent, id: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.select.emit(id);
    }
  }
}
