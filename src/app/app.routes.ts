import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { ChatPage } from './chat/chat.page';

export const routes: Routes = [
  { path: '', component: ShellComponent, children: [
    { path: '', component: ChatPage }
  ]},
];
