import { Routes } from "@angular/router";
import { authGuard } from "./shared/auth.guard";

export const routes: Routes = [
  { path: "auth", loadChildren: () => import("./auth/auth.routes").then(m => m.routes) },
  { path: "chat", canActivate: [authGuard], loadChildren: () => import("./chat/chat.routes").then(m => m.routes) },
  { path: "", pathMatch: "full", redirectTo: "auth" },
  { path: "**", redirectTo: "auth" }
];
