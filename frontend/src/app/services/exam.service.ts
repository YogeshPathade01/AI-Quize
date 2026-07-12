import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Exam {
  id: number; title: string; subject: string; date: string; time: string;
  duration: number; totalQuestions: number; maxXP: number;
  status: 'live' | 'upcoming' | 'completed' | 'practice';
  difficulty: 'Easy' | 'Medium' | 'Hard'; enrolledCount?: number;
  description?: string; scheduledAt?: string;
  isEnrolled?: boolean; hasReminder?: boolean;
}

export interface Question {
  id: number; text: string; options: string[]; correctIndex: number;
  subject: string; explanation?: string;
}

export interface ExamResult {
  examId: number; examTitle: string; date: string;
  score: number; total: number; percentage: number;
  xpEarned: number; rank?: number; timeTaken: string;
}

interface ApiResponse<T> { success: boolean; message: string; data: T; }

@Injectable({ providedIn: 'root' })
export class ExamService {
  private api = 'http://localhost:8081/api';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  private mapExam(e: any): Exam {
    let scheduledStr = e.scheduledAt;
    const dt = scheduledStr ? new Date(scheduledStr) : null;
    return {
      id: e.id, title: e.title, subject: e.subject,
      date: dt ? dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD',
      time: dt ? dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
      duration: e.duration, totalQuestions: e.totalQuestions, maxXP: e.maxXP,
      status: e.status?.toLowerCase() as any,
      difficulty: e.difficulty?.charAt(0) + e.difficulty?.slice(1).toLowerCase() as any,
      enrolledCount: e.enrolledCount, description: e.description, scheduledAt: e.scheduledAt,
      isEnrolled: e.enrolled !== undefined ? e.enrolled : e.isEnrolled,
      hasReminder: e.hasReminder
    };
  }

  private mapQuestion(q: any): Question {
    return {
      id: q.id, text: q.text,
      options: [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean),
      correctIndex: q.correctOptionIndex, subject: q.subject, explanation: q.explanation
    };
  }

  private updateMockExamsStatus(): void {
    const local = JSON.parse(localStorage.getItem('iq_local_exams') || '[]');
    let changed = false;
    const now = new Date();
    local.forEach((e: any) => {
      if (e.scheduledAt) {
        const startTime = new Date(e.scheduledAt);
        const endTime = new Date(startTime.getTime() + (e.duration || 0) * 60 * 1000);
        
        if (e.status === 'upcoming' && startTime <= now) {
          if (now >= endTime) {
            e.status = 'completed';
          } else {
            e.status = 'live';
          }
          changed = true;
        } else if (e.status === 'live' && now >= endTime) {
          e.status = 'completed';
          changed = true;
        }
      }
    });
    if (changed) {
      localStorage.setItem('iq_local_exams', JSON.stringify(local));
    }
  }

  getUpcomingExams(): Observable<Exam[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.api}/exams/upcoming`, { headers: this.headers() }).pipe(
      map(r => (r.data || []).map(e => this.mapExam(e))),
      catchError(() => {
        this.updateMockExamsStatus();
        const local = JSON.parse(localStorage.getItem('iq_local_exams') || '[]').filter((e: Exam) => e.status === 'upcoming');
        return of([...local, ...this.mockUpcoming()]);
      })
    );
  }

  getLiveExams(): Observable<Exam[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.api}/exams/live`, { headers: this.headers() }).pipe(
      map(r => (r.data || []).map(e => this.mapExam(e))),
      catchError(() => {
        this.updateMockExamsStatus();
        const local = JSON.parse(localStorage.getItem('iq_local_exams') || '[]').filter((e: Exam) => e.status === 'live');
        return of([...local, ...this.mockLive()]);
      })
    );
  }

  getMyExams(): Observable<Exam[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.api}/exams/completed`, { headers: this.headers() }).pipe(
      map(r => (r.data || []).map(e => this.mapExam(e))),
      catchError(() => {
        this.updateMockExamsStatus();
        const local = JSON.parse(localStorage.getItem('iq_local_exams') || '[]').filter((e: Exam) => e.status === 'completed');
        return of([...local, ...this.mockMyExams()]);
      })
    );
  }

  getCategorizedExams(): Observable<{ upcoming: Exam[], live: Exam[], completed: Exam[] }> {
    return this.http.get<ApiResponse<{ upcoming: any[], live: any[], completed: any[] }>>(`${this.api}/exams/categorized`, { headers: this.headers() }).pipe(
      map(r => {
        const data = r.data || { upcoming: [], live: [], completed: [] };
        return {
          upcoming: (data.upcoming || []).map(e => this.mapExam(e)),
          live: (data.live || []).map(e => this.mapExam(e)),
          completed: (data.completed || []).map(e => this.mapExam(e))
        };
      }),
      catchError(() => {
        this.updateMockExamsStatus();
        const local = JSON.parse(localStorage.getItem('iq_local_exams') || '[]');
        return of({
          upcoming: [...local.filter((e: Exam) => e.status === 'upcoming'), ...this.mockUpcoming()],
          live: [...local.filter((e: Exam) => e.status === 'live'), ...this.mockLive()],
          completed: [...local.filter((e: Exam) => e.status === 'completed'), ...this.mockMyExams()]
        });
      })
    );
  }

  getExamById(id: number): Observable<Exam> {
    return this.http.get<ApiResponse<any>>(`${this.api}/exams/${id}`, { headers: this.headers() }).pipe(
      map(r => this.mapExam(r.data)),
      catchError(() => {
        const local = JSON.parse(localStorage.getItem('iq_local_exams') || '[]');
        const found = local.find((e: Exam) => e.id === id);
        return found ? of(found) : of({} as Exam);
      })
    );
  }

  getPracticeQuestions(subject: string): Observable<Question[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.api}/exams/practice?subject=${subject}`, { headers: this.headers() }).pipe(
      map(r => (r.data || []).map(q => this.mapQuestion(q))),
      catchError(() => of(this.mockQuestions()))
    );
  }

  getExamQuestions(examId: number): Observable<Question[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.api}/exams/${examId}/questions`, { headers: this.headers() }).pipe(
      map(r => (r.data || []).map(q => this.mapQuestion(q))),
      catchError(() => {
        const localQs = JSON.parse(localStorage.getItem('iq_local_questions_' + examId) || '[]');
        if (localQs.length > 0) {
          return of(localQs.map((q: any, index: number) => ({
            id: index + 1,
            text: q.text,
            options: [q.optionA, q.optionB, q.optionC, q.optionD],
            correctIndex: q.correctOptionIndex,
            subject: q.subject || 'Practice',
            explanation: q.explanation
          })));
        }
        return of([]);
      })
    );
  }

  getResults(): Observable<ExamResult[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.api}/results/my`, { headers: this.headers() }).pipe(
      map(r => (r.data || []).map(res => ({
        examId: res.examId, examTitle: res.examTitle,
        date: res.completedAt ? new Date(res.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '',
        score: res.score, total: res.totalQuestions, percentage: Math.round(res.percentage),
        xpEarned: res.xpEarned, rank: res.rank,
        timeTaken: res.timeTakenSeconds ? `${Math.floor(res.timeTakenSeconds / 60)} min` : ''
      } as ExamResult))),
      catchError(() => of(this.mockResults()))
    );
  }

  submitResult(examId: number, score: number, totalQuestions: number, timeTakenSeconds: number): Observable<any> {
    const payload = { examId, score, totalQuestions, timeTakenSeconds };
    return this.http.post<ApiResponse<any>>(`${this.api}/results`, payload, { headers: this.headers() });
  }

  getLeaderboard(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.api}/results/leaderboard`, { headers: this.headers() }).pipe(
      map(r => (r.data || []).map(p => ({
        rank: p.rank, name: p.name, xp: p.xp, streak: p.streak,
        exams: p.examsCompleted, accuracy: Math.round(p.accuracy),
        avatar: (p.name || 'Student').split(' ').map((n: string) => n ? n[0] : '').join('').slice(0, 2).toUpperCase(),
        isMe: p.userId === this.authService.getUser()?.id
      }))),
      catchError(() => of(this.mockLeaderboard()))
    );
  }

  createExam(examData: any): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.api}/exams`, examData, { headers: this.headers() }).pipe(
      catchError(err => {
        console.warn('Backend exam creation failed, saving locally (Mock Mode):', err);
        const now = new Date();
        const scheduledTime = examData.scheduledAt ? new Date(examData.scheduledAt) : now;
        const computedStatus = (scheduledTime <= now) ? 'live' : 'upcoming';

        const mockExam: Exam = {
          id: Math.floor(Math.random() * 1000) + 100,
          title: examData.title,
          subject: examData.subject,
          description: examData.description,
          duration: examData.duration,
          totalQuestions: examData.questions ? examData.questions.length : 0,
          maxXP: (examData.questions ? examData.questions.length : 0) * 10,
          status: computedStatus as any,
          difficulty: (examData.difficulty || 'Medium') as any,
          date: examData.scheduledAt ? new Date(examData.scheduledAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today',
          time: examData.scheduledAt ? new Date(examData.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'NOW',
          enrolledCount: 0,
          scheduledAt: examData.scheduledAt
        };

        const localCreated = JSON.parse(localStorage.getItem('iq_local_exams') || '[]');
        localCreated.push(mockExam);
        localStorage.setItem('iq_local_exams', JSON.stringify(localCreated));

        localStorage.setItem('iq_local_questions_' + mockExam.id, JSON.stringify(examData.questions || []));

        return of({ success: true, message: 'Exam created successfully (Mock Mode)', data: mockExam });
      })
    );
  }

  toggleExamStatus(examId: number): Observable<any> {
    return this.http.patch<ApiResponse<any>>(`${this.api}/exams/${examId}/status`, {}, { headers: this.headers() }).pipe(
      catchError(() => {
        // Fallback local update
        const local = JSON.parse(localStorage.getItem('iq_local_exams') || '[]');
        const exam = local.find((e: any) => e.id === examId);
        if (exam) {
          const now = new Date();
          if (exam.status === 'live') {
            exam.status = 'completed';
            exam.scheduledAt = new Date(now.getTime() - (exam.duration || 60) * 60 * 1000 - 60000).toISOString();
          } else if (exam.status === 'upcoming') {
            exam.status = 'live';
            exam.scheduledAt = now.toISOString();
          } else {
            exam.status = 'live';
            exam.scheduledAt = now.toISOString();
          }
          localStorage.setItem('iq_local_exams', JSON.stringify(local));
        }
        return of({ success: true, message: 'Exam status toggled (Mock Mode)', data: exam });
      })
    );
  }

  deleteExam(examId: number): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.api}/exams/${examId}`, { headers: this.headers() }).pipe(
      catchError(() => {
        // Fallback local delete
        const local = JSON.parse(localStorage.getItem('iq_local_exams') || '[]');
        const filtered = local.filter((e: any) => e.id !== examId);
        localStorage.setItem('iq_local_exams', JSON.stringify(filtered));
        return of({ success: true, message: 'Exam deleted (Mock Mode)', data: null });
      })
    );
  }

  updateExam(examId: number, examData: any): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.api}/exams/${examId}`, examData, { headers: this.headers() }).pipe(
      catchError(err => {
        console.warn('Backend exam update failed, updating locally (Mock Mode):', err);
        const local = JSON.parse(localStorage.getItem('iq_local_exams') || '[]');
        const userIdx = local.findIndex((e: any) => e.id === examId);
        if (userIdx > -1) {
          const now = new Date();
          const scheduledTime = examData.scheduledAt ? new Date(examData.scheduledAt) : now;
          const computedStatus = (scheduledTime <= now) ? 'live' : 'upcoming';
          local[userIdx] = {
            ...local[userIdx],
            title: examData.title,
            subject: examData.subject,
            description: examData.description,
            duration: examData.duration,
            totalQuestions: examData.questions ? examData.questions.length : 0,
            maxXP: (examData.questions ? examData.questions.length : 0) * 10,
            status: computedStatus,
            difficulty: examData.difficulty,
            date: examData.scheduledAt ? new Date(examData.scheduledAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today',
            time: examData.scheduledAt ? new Date(examData.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'NOW',
            scheduledAt: examData.scheduledAt
          };
          localStorage.setItem('iq_local_exams', JSON.stringify(local));
          localStorage.setItem('iq_local_questions_' + examId, JSON.stringify(examData.questions || []));
        }
        return of({ success: true, message: 'Exam updated successfully (Mock Mode)', data: local[userIdx] });
      })
    );
  }

  getSubmissions(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>('http://localhost:8081/api/submissions', { headers: this.headers() }).pipe(
      map(r => r.data || []),
      catchError(() => {
        const local = JSON.parse(localStorage.getItem('iq_local_submissions') || '[]');
        return of(local);
      })
    );
  }

  submitSubmission(submission: any): Observable<any> {
    return this.http.post<ApiResponse<any>>('http://localhost:8081/api/submissions', submission, { headers: this.headers() }).pipe(
      catchError(() => {
        const currentSubs = JSON.parse(localStorage.getItem('iq_local_submissions') || '[]');
        currentSubs.push(submission);
        localStorage.setItem('iq_local_submissions', JSON.stringify(currentSubs));
        return of({ success: true, data: submission });
      })
    );
  }

  moderateSubmission(id: number, score: number, feedback: string): Observable<any> {
    return this.http.put<ApiResponse<any>>(`http://localhost:8081/api/submissions/${id}/moderate`, { score, feedback }, { headers: this.headers() }).pipe(
      catchError(() => {
        const list = JSON.parse(localStorage.getItem('iq_local_submissions') || '[]');
        const sub = list.find((s: any) => s.id === id);
        if (sub) {
          sub.score = score;
          sub.status = 'APPROVED';
          sub.feedback = feedback;
          localStorage.setItem('iq_local_submissions', JSON.stringify(list));
        }
        return of({ success: true, message: 'Submission moderated', data: sub });
      })
    );
  }

  getTabSwitchLogs(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>('http://localhost:8081/api/submissions/tab-switch-logs', { headers: this.headers() }).pipe(
      map(r => {
        const subs = r.data || [];
        return subs.map((s: any) => ({
          candidateName: s.candidateName,
          examTitle: s.examTitle,
          count: s.tabSwitches,
          severity: s.tabSwitches > 5 ? 'HIGH' : s.tabSwitches > 0 ? 'MEDIUM' : 'NONE',
          time: s.submittedAt ? new Date(s.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Recently'
        }));
      }),
      catchError(() => {
        const logs = JSON.parse(localStorage.getItem('iq_local_tab_switch_logs') || '[]');
        return of(logs);
      })
    );
  }

  isExamCompleted(examId: number): boolean {
    const completedIds = JSON.parse(localStorage.getItem('iq_completed_exam_ids') || '[]');
    return completedIds.includes(examId);
  }

  isExamEnrolled(examId: number, exam?: Exam): boolean {
    if (exam && exam.isEnrolled !== undefined) {
      return exam.isEnrolled;
    }
    const enrolledIds = JSON.parse(localStorage.getItem('iq_enrolled_exam_ids') || '[]');
    return enrolledIds.includes(examId);
  }

  enrollInExam(examId: number): Observable<any> {
    const enrolledIds = JSON.parse(localStorage.getItem('iq_enrolled_exam_ids') || '[]');
    if (!enrolledIds.includes(examId)) {
      enrolledIds.push(examId);
      localStorage.setItem('iq_enrolled_exam_ids', JSON.stringify(enrolledIds));
    }
    return this.http.post<ApiResponse<any>>(`${this.api}/exams/${examId}/enroll`, {}, { headers: this.headers() }).pipe(
      map(r => r.data),
      catchError(() => {
        // Fallback local update
        const examsLocal = JSON.parse(localStorage.getItem('iq_local_exams') || '[]');
        const exam = examsLocal.find((e: any) => e.id === examId);
        if (exam) {
          exam.enrolledCount = (exam.enrolledCount || 0) + 1;
          localStorage.setItem('iq_local_exams', JSON.stringify(examsLocal));
        }
        return of({ success: true, isEnrolled: true, message: 'Enrolled successfully (Mock Mode)' });
      })
    );
  }

  hasReminder(examId: number, exam?: Exam): boolean {
    if (exam && exam.hasReminder !== undefined) {
      return exam.hasReminder;
    }
    const reminderIds = JSON.parse(localStorage.getItem('iq_reminder_exam_ids') || '[]');
    return reminderIds.includes(examId);
  }

  toggleReminder(examId: number): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.api}/exams/${examId}/reminder`, {}, { headers: this.headers() }).pipe(
      map(r => r.data),
      catchError(() => {
        // Fallback local update
        const reminderIds = JSON.parse(localStorage.getItem('iq_reminder_exam_ids') || '[]');
        const index = reminderIds.indexOf(examId);
        let set = false;
        if (index > -1) {
          reminderIds.splice(index, 1);
        } else {
          reminderIds.push(examId);
          set = true;
        }
        localStorage.setItem('iq_reminder_exam_ids', JSON.stringify(reminderIds));
        return of({ success: true, hasReminder: set, message: set ? 'Reminder set' : 'Reminder removed' });
      })
    );
  }


  // ── Fallback mock data ────────────────────────────────────
  private mockUpcoming(): Exam[] {
    return [];
  }
  private mockLive(): Exam[] {
    return [];
  }
  private mockMyExams(): Exam[] {
    return [];
  }
  private mockQuestions(): Question[] {
    return [];
  }
  private mockResults(): ExamResult[] {
    return [];
  }
  private mockLeaderboard(): any[] {
    return [];
  }
}
