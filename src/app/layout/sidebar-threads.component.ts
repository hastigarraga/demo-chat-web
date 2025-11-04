import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

type Thread = { _id:string; title:string };

@Component({
  standalone:true,
  selector:'app-sidebar-threads',
  imports:[CommonModule],
  template:`
  <aside style="width:280px;background:#0b1220;border-right:1px solid #1f2937;padding:12px;height:100vh;overflow:auto">
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button (click)="create.emit()" class="btn">Nuevo</button>
      <button (click)="logout.emit()" class="btn">Logout</button>
    </div>
    <ul style="display:flex;flex-direction:column;gap:6px">
      <li *ngFor="let t of threads" (click)="select.emit(t._id)"
          [style.background]="t._id===selected ? '#111827' : 'transparent'"
          style="padding:8px;border-radius:8px;cursor:pointer;">
        <span>{{t.title || 'Sin título'}}</span>
        <span style="float:right;display:flex;gap:6px">
          <button (click)="rename.emit(t._id); $event.stopPropagation()">✎</button>
          <button (click)="remove.emit(t._id); $event.stopPropagation()">🗑</button>
        </span>
      </li>
    </ul>
  </aside>
  `
})
export class SidebarThreads {
  @Input() threads: Thread[] = [];
  @Input() selected: string | null = null;
  @Output() select = new EventEmitter<string>();
  @Output() create = new EventEmitter<void>();
  @Output() rename = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();
  @Output() logout = new EventEmitter<void>();
}
