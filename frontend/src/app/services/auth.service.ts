import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';

export interface User {
  id: number; name: string; email: string; role: string;
  level: number; xp: number; streak: number;
}

interface ApiResponse<T> { success: boolean; message: string; data: T; }
interface AuthData { token: string; userId: number; name: string; email: string; role: string; level: number; xp: number; streak: number; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = 'http://localhost:8081/api/auth';
  readonly userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const stored = localStorage.getItem('iq_user');
    if (stored) try { this.userSubject.next(JSON.parse(stored)); } catch { }
  }

  private saveSession(d: AuthData): void {
    const user: User = { id: d.userId, name: d.name, email: d.email, role: d.role, level: d.level, xp: d.xp, streak: d.streak };
    localStorage.setItem('iq_token', d.token);
    localStorage.setItem('iq_user', JSON.stringify(user));
    this.userSubject.next(user);
  }

  login(email: string, password: string): Observable<ApiResponse<AuthData>> {
    return this.http.post<ApiResponse<AuthData>>(`${this.api}/login`, { email, password }).pipe(

      tap((resp) => {
        // Handle success response
        if (resp.success && resp.data?.token) {
          this.saveSession(resp.data);
        }
      }),

      catchError((err) => {
        // Default message
        let message = 'Something went wrong. Please try again.';

        // Handle different backend error cases
        if (err.status === 401) {
          message = 'Invalid email or password';
        } else if (err.status === 404) {
          message = 'User not found';
        } else if (err.status === 400) {
          message = err.error?.message || 'Invalid request';
        } else if (err.status === 0) {
          throw err;
        }

        // Return a safe response instead of throwing error
        return of({
          success: false,
          message,
          data: null as any
        });
      })
    );
  }

  register(firstName: string, lastName: string, email: string, password: string, role: string): Observable<ApiResponse<AuthData>> {
    return this.http.post<ApiResponse<AuthData>>(`${this.api}/register`, { firstName, lastName, email, password, role }).pipe(
      tap(resp => { if (resp.success) this.saveSession(resp.data); })
    );
  }

  loginWithGoogle(idToken: string): Observable<ApiResponse<AuthData>> {
    return this.http.post<ApiResponse<AuthData>>(`${this.api}/google`, { idToken }).pipe(
      tap(resp => { if (resp.success && resp.data?.token) this.saveSession(resp.data); })
    );
  }

  forgotPassword(email: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.api}/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.api}/reset-password`, { token, password });
  }

  updateProfile(firstName: string, lastName: string): Observable<ApiResponse<any>> {
    const usersApi = this.api.replace('/auth', '/users');
    return this.http.patch<ApiResponse<any>>(`${usersApi}/me`, { firstName, lastName }).pipe(
      tap(resp => {
        if (resp.success && resp.data) {
          const current = this.userSubject.value;
          if (current) {
            const updatedName = resp.data.fullName || (resp.data.firstName + ' ' + resp.data.lastName);
            const updatedUser: User = {
              ...current,
              name: updatedName
            };
            localStorage.setItem('iq_user', JSON.stringify(updatedUser));
            this.userSubject.next(updatedUser);
          }
        }
      })
    );
  }

  setMockUser(email: string): void {
    const role = (email.toLowerCase().includes('teacher') || email.toLowerCase().includes('evaluator')) ? 'EVALUATOR' : 'STUDENT';
    const mockUser: User = { 
      id: 1, 
      name: role === 'EVALUATOR' ? 'Professor Smith' : 'Rahul Verma', 
      email, 
      role, 
      level: role === 'EVALUATOR' ? 10 : 4, 
      xp: role === 'EVALUATOR' ? 5000 : 1250, 
      streak: 5 
    };
    localStorage.setItem('iq_user', JSON.stringify(mockUser));
    localStorage.setItem('iq_token', 'demo-token');
    this.userSubject.next(mockUser);
  }

  logout(): void {
    localStorage.removeItem('iq_token');
    localStorage.removeItem('iq_user');
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null { return localStorage.getItem('iq_token'); }
  getUser(): User | null { return this.userSubject.value; }
  isLoggedIn(): boolean { return !!this.userSubject.value; }
}
