import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/layout/topbar/topbar.component';
import { ExamService, Exam } from '../../services/exam.service';

@Component({ selector: 'app-my-exams', standalone: true, imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent], templateUrl: './my-exams.component.html', styleUrls: ['./my-exams.component.scss'] })
export class MyExamsComponent implements OnInit {
  exams: Exam[] = [];
  constructor(private examService: ExamService) {}
  ngOnInit(): void { this.examService.getMyExams().subscribe(e => this.exams = e); }
}
