import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Notification {
  id: number;
  icon: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'success' | 'info' | 'warning' | 'danger';
}

interface ApiResponse<T> { success: boolean; message: string; data: T; }

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private api = 'http://localhost:8081/api/notifications';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  getNotifications(): Observable<Notification[]> {
    return this.http.get<ApiResponse<Notification[]>>(this.api, { headers: this.headers() }).pipe(
      map(r => r.data || []),
      catchError(() => {
        return of([]);
      })
    );
  }

  markRead(id: number): Observable<Notification> {
    return this.http.put<ApiResponse<Notification>>(`${this.api}/${id}/read`, {}, { headers: this.headers() }).pipe(
      map(r => r.data),
      catchError(() => {
        const local = JSON.parse(localStorage.getItem('iq_local_notifications') || '[]');
        const found = local.find((n: Notification) => n.id === id);
        if (found) {
          found.read = true;
          localStorage.setItem('iq_local_notifications', JSON.stringify(local));
        }
        return of(found);
      })
    );
  }

  markAllRead(): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.api}/read-all`, {}, { headers: this.headers() }).pipe(
      catchError(() => {
        const local = JSON.parse(localStorage.getItem('iq_local_notifications') || '[]');
        local.forEach((n: Notification) => n.read = true);
        localStorage.setItem('iq_local_notifications', JSON.stringify(local));
        return of({ success: true });
      })
    );
  }

  dismiss(id: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.api}/${id}`, { headers: this.headers() }).pipe(
      catchError(() => {
        let local = JSON.parse(localStorage.getItem('iq_local_notifications') || '[]');
        local = local.filter((n: Notification) => n.id !== id);
        localStorage.setItem('iq_local_notifications', JSON.stringify(local));
        return of({ success: true });
      })
    );
  }
}
