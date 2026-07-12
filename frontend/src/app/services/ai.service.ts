import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Exam, Question } from './exam.service';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private api = 'http://localhost:8081/api/ai';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`
    });
  }

  generateQuiz(topic: string, difficulty: string, numQuestions: number): Observable<Exam> {
    return this.http.post<ApiResponse<any>>(`${this.api}/generate-quiz`, {
      topic,
      difficulty,
      numQuestions
    }, { headers: this.headers() }).pipe(
      map(r => this.mapExam(r.data))
    );
  }

  explainQuestion(
    questionText: string,
    options: string[],
    correctIndex: number,
    selectedIndex: number | null,
    chatHistory: { role: 'user' | 'model'; text: string }[]
  ): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.api}/explain`, {
      questionText,
      options,
      correctIndex,
      selectedIndex,
      chatHistory
    }, { headers: this.headers() }).pipe(
      map(r => r.data)
    );
  }

  getRecommendations(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.api}/recommendations`, {
      headers: this.headers()
    }).pipe(
      map(r => r.data || [])
    );
  }

  private mapExam(e: any): Exam {
    const dt = e.scheduledAt ? new Date(e.scheduledAt) : null;
    return {
      id: e.id,
      title: e.title,
      subject: e.subject,
      date: dt ? dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD',
      time: dt ? dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
      duration: e.duration,
      totalQuestions: e.totalQuestions,
      maxXP: e.maxXP,
      status: e.status?.toLowerCase() as any,
      difficulty: e.difficulty?.charAt(0) + e.difficulty?.slice(1).toLowerCase() as any,
      enrolledCount: e.enrolledCount,
      description: e.description,
      scheduledAt: e.scheduledAt
    };
  }
}
