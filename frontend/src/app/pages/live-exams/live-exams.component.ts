import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/layout/topbar/topbar.component';
import { ExamService, Exam } from '../../services/exam.service';

@Component({ selector: 'app-live-exams', standalone: true, imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent], templateUrl: './live-exams.component.html', styleUrls: ['./live-exams.component.scss'] })
export class LiveExamsComponent implements OnInit, OnDestroy {
  liveExams: Exam[] = [];
  private intervalId: any;

  constructor(private examService: ExamService) {}

  ngOnInit(): void {
    this.loadExams();
    this.intervalId = setInterval(() => {
      this.loadExams();
    }, 5000);
  }

  loadExams(): void {
    this.examService.getLiveExams().subscribe(e => this.liveExams = e);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  getDiffClass(d: string) { return d === 'Easy' ? 'badge-success' : d === 'Medium' ? 'badge-warning' : 'badge-danger'; }

  isExamCompleted(examId: number): boolean {
    return this.examService.isExamCompleted(examId);
  }
}
