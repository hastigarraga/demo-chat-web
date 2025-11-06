import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

function hasCookie(name: string): boolean {
  return new RegExp('(?:^|; )' + name.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&') + '=').test(document.cookie);
}

/**
 * Guard rápido y estable:
 * - Si hay token en LS o cookie `access`, deja pasar (la validez la resuelve el interceptor).
 * - Si no hay nada, corta y devuelve UrlTree('/auth') sin pegar al server (evita 401 tempranos).
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const hasLs = !!localStorage.getItem('token');
  const hasCk = hasCookie('access');
  return (hasLs || hasCk) ? true : router.createUrlTree(['/auth']);
};
