import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [CommonModule, RouterOutlet],
  template: `
  <div class="layout">
    <aside class="sidebar">
      <header class="sidebar__header">Threads</header>

      <!-- Placeholder de lista de hilos (P1: persistencia local) -->
      <nav class="threads">
        <button class="thread is-active" type="button" title="Thread actual">
          <span class="dot"></span>
          <span>Conversación</span>
        </button>
        <button class="thread" type="button" title="Nuevo thread" (click)="newThread()">
          <span class="plus">+</span>
          <span>Nuevo thread</span>
        </button>
      </nav>

      <footer class="sidebar__footer">
        <button class="btn ghost" type="button" (click)="newThread()">+ Nuevo</button>
      </footer>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="brand">Chat</div>
      </header>
      <section class="content">
        <router-outlet></router-outlet>
      </section>
    </main>
  </div>
  `,
})
export class ShellComponent {
  newThread() {
    // P1: crear/persistir id de thread y navegar.
    // Por ahora, el chat usa un único thread implícito.
    location.reload();
  }
}
