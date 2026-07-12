import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/layout/topbar/topbar.component';
import { ExamService } from '../../services/exam.service';

@Component({ selector: 'app-leaderboard', standalone: true, imports: [CommonModule, SidebarComponent, TopbarComponent], templateUrl: './leaderboard.component.html', styleUrls: ['./leaderboard.component.scss'] })
export class LeaderboardComponent implements OnInit {
  players: any[] = [];
  top3: any[] = [];
  rest: any[] = [];
  constructor(private examService: ExamService) {}
  ngOnInit(): void { this.examService.getLeaderboard().subscribe(p => { this.players = p; this.top3 = p.slice(0,3); this.rest = p.slice(3); }); }
  getMedalEmoji(r: number): string { return r===1?'🥇':r===2?'🥈':'🥉'; }
  getPodiumOrder(): any[] { return this.top3.length>=3 ? [this.top3[1],this.top3[0],this.top3[2]] : this.top3; }
  getPodiumHeight(r: number): string { return r===1?'120px':r===2?'90px':'70px'; }
}
