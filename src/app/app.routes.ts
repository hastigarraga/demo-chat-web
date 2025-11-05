import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { ChatPage } from './chat/chat.page';
import { LoginPage } from './auth/login.page';

export const routes: Routes = [
  { path: 'login', component: LoginPage }, // pantalla SPA
  {
    path: '',
    component: ShellComponent,
    children: [{ path: '', component: ChatPage }]
  },
  { path: '**', redirectTo: '' }
];
