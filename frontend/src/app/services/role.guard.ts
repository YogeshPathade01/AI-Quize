import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const expectedRoles = route.data['expectedRoles'] as string[];

  if (!auth.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const user = auth.getUser();
  if (expectedRoles && expectedRoles.length > 0 && (!user || !expectedRoles.includes(user.role))) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
