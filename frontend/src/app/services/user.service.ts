import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

interface ApiResponse<T> { success: boolean; message: string; data: T; }

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private api = 'http://localhost:8081/api/users';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  getAllUsers(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(this.api, { headers: this.headers() }).pipe(
      map(r => r.data || []),
      catchError(() => {
        // Fallback mock users list
        const localUsers = JSON.parse(localStorage.getItem('iq_local_users') || '[]');
        if (localUsers.length === 0) {
          const defaults = [
            { id: 1, firstName: 'Rahul', lastName: 'Verma', email: 'rahul@example.com', role: 'STUDENT', level: 4, xp: 1250, streak: 5 },
            { id: 2, firstName: 'Priya', lastName: 'Sharma', email: 'priya@example.com', role: 'STUDENT', level: 8, xp: 3840, streak: 12 },
            { id: 3, firstName: 'Teacher', lastName: 'One', email: 'teacher@example.com', role: 'EVALUATOR', level: 5, xp: 2000, streak: 10 },
            { id: 4, firstName: 'Admin', lastName: 'User', email: 'admin@igniterquiz.com', role: 'ADMIN', level: 10, xp: 5000, streak: 30 }
          ];
          localStorage.setItem('iq_local_users', JSON.stringify(defaults));
          return of(defaults);
        }
        return of(localUsers);
      })
    );
  }

  updateUserRole(userId: number, role: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.api}/${userId}/role`, { role }, { headers: this.headers() }).pipe(
      catchError(() => {
        // Fallback local update
        const users = JSON.parse(localStorage.getItem('iq_local_users') || '[]');
        const user = users.find((u: any) => u.id === userId);
        if (user) {
          user.role = role;
          localStorage.setItem('iq_local_users', JSON.stringify(users));
        }
        return of({ success: true, message: 'User role updated (Mock Mode)', data: user });
      })
    );
  }

  updateUser(userId: number, userDetails: any): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.api}/${userId}`, userDetails, { headers: this.headers() }).pipe(
      catchError(() => {
        // Fallback local update
        const users = JSON.parse(localStorage.getItem('iq_local_users') || '[]');
        const userIdx = users.findIndex((u: any) => u.id === userId);
        if (userIdx > -1) {
          users[userIdx] = { ...users[userIdx], ...userDetails };
          localStorage.setItem('iq_local_users', JSON.stringify(users));
        }
        return of({ success: true, message: 'User updated (Mock Mode)', data: users[userIdx] });
      })
    );
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.api}/${userId}`, { headers: this.headers() }).pipe(
      catchError(() => {
        // Fallback local delete
        const users = JSON.parse(localStorage.getItem('iq_local_users') || '[]');
        const filtered = users.filter((u: any) => u.id !== userId);
        localStorage.setItem('iq_local_users', JSON.stringify(filtered));
        return of({ success: true, message: 'User deleted (Mock Mode)', data: null });
      })
    );
  }
}
