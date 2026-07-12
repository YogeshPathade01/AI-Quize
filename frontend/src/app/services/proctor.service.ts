import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface ActiveSession {
  id: number;
  userId: number;
  studentName: string;
  examId: number;
  examTitle: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  tabSwitches: number;
  timeRemaining: number;
  isPaused: boolean;
  isDisqualified: boolean;
  warningMessage: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'DISQUALIFIED' | 'SUBMITTED';
  updatedAt: string;
}

interface ApiResponse<T> { success: boolean; message: string; data: T; }

@Injectable({
  providedIn: 'root'
})
export class ProctorService {
  private api = 'http://localhost:8081/api/proctor/sessions';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  private mapSession(s: any): ActiveSession {
    if (!s) return s;
    return {
      ...s,
      isPaused: s.isPaused !== undefined ? s.isPaused : s.paused,
      isDisqualified: s.isDisqualified !== undefined ? s.isDisqualified : s.disqualified
    };
  }

  createSession(examId: number, examTitle: string, totalQuestions: number, timeRemaining: number): Observable<ActiveSession> {
    const payload = { examId, examTitle, totalQuestions, timeRemaining };
    return this.http.post<ApiResponse<ActiveSession>>(this.api, payload, { headers: this.headers() }).pipe(
      map(r => this.mapSession(r.data)),
      catchError(() => {
        // Fallback mock session in localStorage
        const mock: ActiveSession = {
          id: Math.floor(Math.random() * 9000) + 1000,
          userId: this.authService.getUser()?.id || 1,
          studentName: this.authService.getUser()?.name || 'Rahul Verma',
          examId,
          examTitle,
          currentQuestionIndex: 0,
          totalQuestions,
          tabSwitches: 0,
          timeRemaining,
          isPaused: false,
          isDisqualified: false,
          warningMessage: null,
          status: 'ACTIVE',
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(`iq_proctor_session_${examId}`, JSON.stringify(mock));
        
        // Push to active session list mocks
        const activeList = JSON.parse(localStorage.getItem('iq_proctor_active_list') || '[]');
        const idx = activeList.findIndex((s: any) => s.userId === mock.userId && s.examId === examId);
        if (idx >= 0) activeList[idx] = mock;
        else activeList.push(mock);
        localStorage.setItem('iq_proctor_active_list', JSON.stringify(activeList));

        return of(mock);
      })
    );
  }

  updateSession(sessionId: number, currentQuestionIndex: number, tabSwitches: number, timeRemaining: number): Observable<ActiveSession> {
    const payload = { currentQuestionIndex, tabSwitches, timeRemaining };
    return this.http.put<ApiResponse<ActiveSession>>(`${this.api}/${sessionId}`, payload, { headers: this.headers() }).pipe(
      map(r => this.mapSession(r.data)),
      catchError(() => {
        // Fallback mock
        const activeList = JSON.parse(localStorage.getItem('iq_proctor_active_list') || '[]');
        const mock = activeList.find((s: any) => s.id === sessionId);
        if (mock && !mock.isPaused && !mock.isDisqualified) {
          mock.currentQuestionIndex = currentQuestionIndex;
          mock.tabSwitches = tabSwitches;
          mock.timeRemaining = timeRemaining;
          mock.updatedAt = new Date().toISOString();
          localStorage.setItem('iq_proctor_active_list', JSON.stringify(activeList));
          
          // Keep specific session stored
          localStorage.setItem(`iq_proctor_session_${mock.examId}`, JSON.stringify(mock));
        }
        return of(mock);
      })
    );
  }

  getActiveSessions(): Observable<ActiveSession[]> {
    return this.http.get<ApiResponse<ActiveSession[]>>(this.api, { headers: this.headers() }).pipe(
      map(r => (r.data || []).map(s => this.mapSession(s))),
      catchError(() => {
        const activeList = JSON.parse(localStorage.getItem('iq_proctor_active_list') || '[]');
        // Filter out completed ones, just return active/paused/disqualified
        return of(activeList.filter((s: any) => ['ACTIVE', 'PAUSED', 'DISQUALIFIED'].includes(s.status)));
      })
    );
  }

  getSessionStatus(examId: number): Observable<ActiveSession | null> {
    return this.http.get<ApiResponse<ActiveSession>>(`${this.api}/status?examId=${examId}`, { headers: this.headers() }).pipe(
      map(r => r.data ? this.mapSession(r.data) : null),
      catchError(() => {
        const mock = JSON.parse(localStorage.getItem(`iq_proctor_session_${examId}`) || 'null');
        return of(mock);
      })
    );
  }

  sendWarning(sessionId: number, message: string): Observable<ActiveSession> {
    return this.http.put<ApiResponse<ActiveSession>>(`${this.api}/${sessionId}/warn`, { message }, { headers: this.headers() }).pipe(
      map(r => this.mapSession(r.data)),
      catchError(() => {
        const activeList = JSON.parse(localStorage.getItem('iq_proctor_active_list') || '[]');
        const mock = activeList.find((s: any) => s.id === sessionId);
        if (mock) {
          mock.warningMessage = message;
          localStorage.setItem('iq_proctor_active_list', JSON.stringify(activeList));
          localStorage.setItem(`iq_proctor_session_${mock.examId}`, JSON.stringify(mock));
        }
        return of(mock);
      })
    );
  }

  togglePause(sessionId: number): Observable<ActiveSession> {
    return this.http.put<ApiResponse<ActiveSession>>(`${this.api}/${sessionId}/pause`, {}, { headers: this.headers() }).pipe(
      map(r => this.mapSession(r.data)),
      catchError(() => {
        const activeList = JSON.parse(localStorage.getItem('iq_proctor_active_list') || '[]');
        const mock = activeList.find((s: any) => s.id === sessionId);
        if (mock) {
          mock.isPaused = !mock.isPaused;
          mock.status = mock.isPaused ? 'PAUSED' : 'ACTIVE';
          localStorage.setItem('iq_proctor_active_list', JSON.stringify(activeList));
          localStorage.setItem(`iq_proctor_session_${mock.examId}`, JSON.stringify(mock));
        }
        return of(mock);
      })
    );
  }

  disqualify(sessionId: number): Observable<ActiveSession> {
    return this.http.put<ApiResponse<ActiveSession>>(`${this.api}/${sessionId}/disqualify`, {}, { headers: this.headers() }).pipe(
      map(r => this.mapSession(r.data)),
      catchError(() => {
        const activeList = JSON.parse(localStorage.getItem('iq_proctor_active_list') || '[]');
        const mock = activeList.find((s: any) => s.id === sessionId);
        if (mock) {
          mock.isDisqualified = true;
          mock.status = 'DISQUALIFIED';
          localStorage.setItem('iq_proctor_active_list', JSON.stringify(activeList));
          localStorage.setItem(`iq_proctor_session_${mock.examId}`, JSON.stringify(mock));
        }
        return of(mock);
      })
    );
  }

  submitSession(sessionId: number): Observable<ActiveSession> {
    return this.http.put<ApiResponse<ActiveSession>>(`${this.api}/${sessionId}/submit`, {}, { headers: this.headers() }).pipe(
      map(r => this.mapSession(r.data)),
      catchError(() => {
        const activeList = JSON.parse(localStorage.getItem('iq_proctor_active_list') || '[]');
        const mock = activeList.find((s: any) => s.id === sessionId);
        if (mock) {
          mock.status = 'SUBMITTED';
          localStorage.setItem('iq_proctor_active_list', JSON.stringify(activeList));
          localStorage.setItem(`iq_proctor_session_${mock.examId}`, JSON.stringify(mock));
        }
        return of(mock);
      })
    );
  }
}
