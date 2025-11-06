import { Routes } from "@angular/router";
import { LoginPage } from "./login.page";
import { SignupPage } from "./signup.page";

export const routes: Routes = [
  { path: "", component: LoginPage },
  { path: "signup", component: SignupPage }
];
