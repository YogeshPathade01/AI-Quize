import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/layout/topbar/topbar.component';
import { ExamService, Exam } from '../../services/exam.service';

@Component({
  selector: 'app-completed-exams',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent],
  templateUrl: './completed-exams.component.html',
  styleUrls: ['./completed-exams.component.scss']
})
export class CompletedExamsComponent implements OnInit {
  exams: Exam[] = [];

  constructor(private examService: ExamService) {}

  ngOnInit(): void {
    this.loadExams();
  }

  loadExams(): void {
    this.examService.getMyExams().subscribe(e => this.exams = e);
  }

  getDiffClass(d: string) {
    return d === 'Easy' ? 'badge-success' : d === 'Medium' ? 'badge-warning' : 'badge-danger';
  }
}
