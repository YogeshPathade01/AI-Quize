import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/layout/topbar/topbar.component';
import { ExamService, ExamResult } from '../../services/exam.service';

@Component({ selector: 'app-my-results', standalone: true, imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent], templateUrl: './my-results.component.html', styleUrls: ['./my-results.component.scss'] })
export class MyResultsComponent implements OnInit {
  results: ExamResult[] = [];
  constructor(private examService: ExamService) {}
  ngOnInit(): void { this.examService.getResults().subscribe(r => this.results = r); }
  getScoreColor(p: number): string { return p >= 80 ? 'var(--success)' : p >= 60 ? 'var(--warning)' : 'var(--danger)'; }
  get totalXP(): number { return this.results.reduce((s, r) => s + r.xpEarned, 0); }
  get avgScore(): number { return this.results.length ? Math.round(this.results.reduce((s,r)=>s+r.percentage,0)/this.results.length) : 0; }
}
