import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarThreads, Thread } from './sidebar-threads.component';
import { listThreads, createThread, updateThreadTitle, deleteThread } from '../api';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [CommonModule, RouterOutlet, SidebarThreads],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
})
export class ShellComponent implements OnInit {
  private STORAGE_KEY = 'currentThreadId';
  threads = signal<Thread[]>([]);
  selectedId = signal<string | null>(null);
  busy = signal<boolean>(false);

  constructor() {
    console.log('[SHELL] constructor');
  }

  async ngOnInit() {
    console.log('[SHELL] ngOnInit → refresh threads');
    await this.refresh();
    let current = localStorage.getItem(this.STORAGE_KEY);
    if (!current || !this.threads().some(t => t._id === current)) {
      current = await this.ensureOneThread();
    }
    this.setSelected(current!);
    console.log('[SHELL] ready', { selectedId: this.selectedId() });
  }

  private async refresh() {
    try {
      this.busy.set(true);
      const rows = await listThreads().catch(() => []);
      console.log('[SHELL] threads', rows);
      this.threads.set(rows || []);
    } finally { this.busy.set(false); }
  }

  private setSelected(id: string) {
    this.selectedId.set(id);
    localStorage.setItem(this.STORAGE_KEY, id);
  }

  private async ensureOneThread(): Promise<string> {
    if (this.threads().length > 0) return this.threads()[0]._id;
    const t = await createThread('Default');
    await this.refresh();
    return t._id;
  }

  async handleCreate() { /* igual que antes */ this.busy.set(true);
    try { const t = await createThread('Nuevo chat'); await this.refresh(); this.setSelected(t._id); }
    finally { this.busy.set(false); } }

  handleSelect(id: string) { this.setSelected(id); }

  async handleRename(ev: { id: string; title: string }) { this.busy.set(true);
    try { await updateThreadTitle(ev.id, ev.title); await this.refresh(); this.setSelected(ev.id); }
    finally { this.busy.set(false); } }

  async handleRemove(id: string) { this.busy.set(true);
    try { await deleteThread(id); await this.refresh();
      const first = this.threads()[0]?._id || (await this.ensureOneThread()); this.setSelected(first); }
    finally { this.busy.set(false); } }
}
