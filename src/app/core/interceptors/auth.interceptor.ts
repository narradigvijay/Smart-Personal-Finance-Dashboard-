import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { throwError, BehaviorSubject } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Shared state for concurrent refresh handling
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

function addAuthHeader(req: HttpRequest<any>, token: string): HttpRequest<any> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const AuthInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const router = inject(Router);

  // Use a skip header to prevent infinite loops on refresh/auth calls themselves.
  // AuthService tags its own internal HTTP calls with this header.
  if (req.headers.has('X-Skip-Interceptor')) {
    const cleanReq = req.clone({ headers: req.headers.delete('X-Skip-Interceptor') });
    return next(cleanReq);
  }

  const authService = inject(AuthService);

  const isLogoutRequest  = req.url.includes('/auth/logout');
  const isRefreshRequest = req.url.includes('/auth/refresh');

  const token = authService.getToken() ?? (isLogoutRequest ? authService.getLastKnownToken() : null);
  const authReq = token ? addAuthHeader(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isLogoutRequest || isRefreshRequest) {
        if (error.status === 401 && !isLogoutRequest) {
          authService.logout();
          router.navigate(['/login']);
        }
        return throwError(() => error);
      }

      if (!authService.getRefreshToken()) {
        authService.logout();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      if (isRefreshing) {
        return refreshTokenSubject.pipe(
          filter(t => t !== null),
          take(1),
          switchMap(newToken => next(addAuthHeader(req, newToken!)))
        );
      }

      isRefreshing = true;
      refreshTokenSubject.next(null);

      return authService.refreshAccessToken().pipe(
        switchMap((response: any) => {
          isRefreshing = false;
          const newToken = response.token;
          refreshTokenSubject.next(newToken);
          return next(addAuthHeader(req, newToken));
        }),
        catchError(refreshError => {
          isRefreshing = false;
          authService.logout();
          router.navigate(['/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
