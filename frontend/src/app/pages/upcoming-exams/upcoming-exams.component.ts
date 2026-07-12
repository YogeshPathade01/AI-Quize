import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/layout/topbar/topbar.component';
import { ExamService, Exam } from '../../services/exam.service';
import { AuthService } from '../../services/auth.service';

@Component({ selector: 'app-upcoming-exams', standalone: true, imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent], templateUrl: './upcoming-exams.component.html', styleUrls: ['./upcoming-exams.component.scss'] })
export class UpcomingExamsComponent implements OnInit, OnDestroy {
  exams: Exam[] = [];
  private intervalId: any;

  constructor(private examService: ExamService, private authService: AuthService) {}

  isStudent(): boolean {
    const user = this.authService.getUser();
    return user?.role === 'STUDENT';
  }

  isEnrolled(exam: Exam): boolean {
    return this.examService.isExamEnrolled(exam.id, exam);
  }

  hasReminder(exam: Exam): boolean {
    return this.examService.hasReminder(exam.id, exam);
  }

  enroll(exam: Exam): void {
    if (!this.isStudent()) return;
    if (this.isEnrolled(exam)) {
      alert(`You are already enrolled in ${exam.title}.`);
      return;
    }
    this.examService.enrollInExam(exam.id).subscribe({
      next: (res) => {
        alert(`Successfully enrolled in ${exam.title}!`);
        exam.isEnrolled = true;
        exam.enrolledCount = (exam.enrolledCount || 0) + 1;
      },
      error: (err) => {
        console.error(err);
        alert('Failed to enroll. Please try again.');
      }
    });
  }

  toggleReminder(exam: Exam): void {
    if (!this.isStudent()) return;
    this.examService.toggleReminder(exam.id).subscribe({
      next: (res) => {
        const set = (res && res.hasReminder !== undefined) ? res.hasReminder : !exam.hasReminder;
        exam.hasReminder = set;
        if (set) {
          alert(`Reminder set for ${exam.title}. We'll notify you before the exam starts!`);
        } else {
          alert(`Reminder removed for ${exam.title}.`);
        }
      },
      error: (err) => {
        console.error(err);
        alert('Failed to set reminder.');
      }
    });
  }


  ngOnInit(): void {
    this.loadExams();
    this.intervalId = setInterval(() => {
      this.checkTransitions();
    }, 5000);
  }

  loadExams(): void {
    this.examService.getUpcomingExams().subscribe(e => this.exams = e);
  }

  checkTransitions(): void {
    const now = new Date();
    let hasChanged = false;
    for (const exam of this.exams) {
      if (exam.scheduledAt && new Date(exam.scheduledAt) <= now) {
        hasChanged = true;
        break;
      }
    }
    if (hasChanged) {
      this.loadExams();
    }
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  getDiffClass(d: string) { return d === 'Easy' ? 'badge-success' : d === 'Medium' ? 'badge-warning' : 'badge-danger'; }
}
