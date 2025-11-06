import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type Thread = { _id: string; title: string };

@Component({
  standalone: true,
  selector: 'app-sidebar-threads',
  imports: [CommonModule],
  templateUrl: './sidebar-threads.component.html',
  styleUrls: ['./sidebar-threads.component.scss'],
})
export class SidebarThreads {
  @Input() threads: Thread[] = [];
  @Input() selectedId: string | null = null;
  @Input() busy = false;

  @Output() create = new EventEmitter<void>();
  @Output() select = new EventEmitter<string>();
  @Output() rename = new EventEmitter<{ id: string; title: string }>();
  @Output() remove = new EventEmitter<string>();

  trackById = (_: number, t: Thread) => t._id;

  onCreate() { this.create.emit(); }
  onSelect(id: string) { this.select.emit(id); }
  onRename(id: string, curr: string) {
    const title = prompt('Nuevo título', curr || 'Nuevo chat')?.trim();
    if (title) this.rename.emit({ id, title });
  }
  onDelete(id: string) {
    if (confirm('¿Eliminar este chat?')) this.remove.emit(id);
  }
}
