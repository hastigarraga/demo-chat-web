import { CanActivateFn, Router } from "@angular/router";
import { inject } from "@angular/core";

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const has = !!localStorage.getItem("token");
  if (!has) router.navigateByUrl("/auth");
  return has;
};
