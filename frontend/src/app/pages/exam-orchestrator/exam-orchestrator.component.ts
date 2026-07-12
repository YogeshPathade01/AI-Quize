import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/layout/topbar/topbar.component';
import { ExamService, Exam } from '../../services/exam.service';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-exam-orchestrator',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './exam-orchestrator.component.html',
  styleUrls: ['./exam-orchestrator.component.scss']
})
export class ExamOrchestratorComponent implements OnInit {
  user: User | null = null;
  allExams: Exam[] = [];
  filteredExams: Exam[] = [];
  searchQuery = '';
  loadingData = false;

  constructor(
    private examService: ExamService,
    private authService: AuthService
  ) {
    this.user = this.authService.getUser();
  }

  ngOnInit(): void {
    this.loadAllExams();
  }

  loadAllExams(): void {
    this.loadingData = true;
    this.examService.getCategorizedExams().subscribe({
      next: (cat) => {
        this.allExams = [...cat.live, ...cat.upcoming, ...cat.completed];
        this.onSearchChange();
        this.loadingData = false;
      },
      error: (err) => {
        console.error('Failed to load exams', err);
        this.loadingData = false;
      }
    });
  }

  onSearchChange(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredExams = this.allExams;
    } else {
      this.filteredExams = this.allExams.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.subject.toLowerCase().includes(query)
      );
    }
  }

  deleteExam(exam: Exam): void {
    if (confirm(`Are you sure you want to permanently cancel and delete the exam "${exam.title}"? This will remove all associated student results and schedules.`)) {
      this.examService.deleteExam(exam.id).subscribe({
        next: () => {
          this.loadAllExams();
        },
        error: (err) => {
          console.error('Failed to delete exam', err);
        }
      });
    }
  }
}
