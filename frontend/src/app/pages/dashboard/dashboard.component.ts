import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/layout/topbar/topbar.component';
import { ExamService, Exam } from '../../services/exam.service';
import { AuthService, User } from '../../services/auth.service';
import { AiService } from '../../services/ai.service';
import { UserService } from '../../services/user.service';
import { ProctorService, ActiveSession } from '../../services/proctor.service';

interface Activity { icon: string; text: string; time: string; xp: number; color: string; }
interface ChartPoint { label: string; value: number; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  user: User | null;
  upcomingExam: Exam | null = null;
  liveExams: Exam[] = [];
  completedExams: Exam[] = [];
  bestScore = 0;
  avgScore = 0;
  Math = Math;
  private refreshInterval: any;

  // Student specific stats
  stats = [
    { icon: '🏅', label: 'Total XP', value: '0', change: '0-day streak', color: '#e8e3ff', iconBg: '#d4ccff' },
    { icon: '🎯', label: 'Accuracy', value: '0%', change: 'No exams yet', color: '#e8faf6', iconBg: '#c5f0e5' },
    { icon: '📋', label: 'Exams Taken', value: '0', change: 'All-time stats', color: '#fff4e0', iconBg: '#fde8b0' },
    { icon: '🔔', label: 'Notifications', value: '0', change: 'View all', color: '#eaf4ff', iconBg: '#c8e5ff' }
  ];

  activities: Activity[] = [];

  chartPoints: ChartPoint[] = [];

  countdown = { hrs: 2, min: 15, sec: 22 };
  private timer: any;

  recommendations: any[] = [];
  loadingRecommendations = false;

  // Evaluator specific properties
  submissions: any[] = [];
  tabSwitchLogs: any[] = [];
  evaluatorStats = {
    pendingReviews: 0,
    moderationsCount: 0,
    tabSwitchesDetected: 0,
    activeAssessments: 0
  };
  showReviewModal = false;
  selectedSub: any = null;
  modScore = 0;
  modFeedback = '';
  evaluatorTab: 'plagiarism' | 'moderation' | 'proctor' = 'plagiarism';
  similarityReports: any[] = [];
  showCompareModal = false;
  selectedCompareReport: any = null;
  compareQuestions: any[] = [];
  activeSessions: ActiveSession[] = [];

  // Admin specific properties
  adminStats = {
    totalUsers: 0,
    studentsCount: 0,
    evaluatorsCount: 0,
    totalExams: 0
  };

  // Shared properties
  allExams: Exam[] = [];
  loadingData = false;

  constructor(
    private examService: ExamService, 
    private authService: AuthService,
    private aiService: AiService,
    private userService: UserService,
    private proctorService: ProctorService
  ) {
    this.user = authService.getUser();
  }

  loadStudentExams(): void {
    this.examService.getCategorizedExams().subscribe(cat => {
      this.upcomingExam = cat.upcoming[0] || null;
      this.liveExams = cat.live;
      this.completedExams = cat.completed;
    });
  }

  ngOnInit(): void {
    if (!this.user) return;

    if (this.user.role === 'STUDENT') {
      this.loadStudentExams();
      this.startCountdown();
      this.loadRecommendations();
      
      this.examService.getResults().subscribe(results => {
        this.updateStats(results);
      });

      this.refreshInterval = setInterval(() => {
        this.loadStudentExams();
      }, 5000);
    } else if (this.user.role === 'EVALUATOR') {
      this.loadEvaluatorData();
      this.refreshInterval = setInterval(() => {
        if (this.evaluatorTab === 'proctor') {
          this.loadActiveSessions();
        }
      }, 3000);
    } else if (this.user.role === 'ADMIN') {
      this.loadAdminData();
      this.refreshInterval = setInterval(() => {
        this.loadActiveSessions();
      }, 3000);
    }
  }

  // ── STUDENT FLOW ──────────────────────────────────────────────────────────

  updateStats(results: any[]): void {
    const totalXP = this.user?.xp || 0;
    const examsCount = results.length;
    
    const totalPercentage = results.reduce((sum, r) => sum + r.percentage, 0);
    const avgAccuracy = results.length > 0 ? Math.round(totalPercentage / results.length) : 0;

    this.bestScore = results.length > 0 ? Math.max(...results.map(r => r.xpEarned)) : 0;
    this.avgScore = results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.xpEarned, 0) / results.length) : 0;

    this.stats = [
      { icon: '🏅', label: 'Total XP', value: totalXP.toLocaleString(), change: `${this.user?.streak || 0}-day streak`, color: '#e8e3ff', iconBg: '#d4ccff' },
      { icon: '🎯', label: 'Accuracy', value: `${avgAccuracy}%`, change: results.length > 0 ? 'Overall Average' : 'No exams yet', color: '#e8faf6', iconBg: '#c5f0e5' },
      { icon: '📋', label: 'Exams Taken', value: examsCount.toString(), change: 'All-time stats', color: '#fff4e0', iconBg: '#fde8b0' },
      { icon: '🔔', label: 'Notifications', value: '3', change: 'View all', color: '#eaf4ff', iconBg: '#c8e5ff' }
    ];

    this.generateChartPoints(results);
    this.updateActivities(results);
  }

  updateActivities(results: any[]): void {
    const activitiesList: Activity[] = [];
    if (this.user && this.user.streak > 0) {
      activitiesList.push({
        icon: '🔥',
        text: `Maintained ${this.user.streak}-day learning streak!`,
        time: 'Today',
        xp: this.user.streak * 10,
        color: 'var(--danger)'
      });
    }

    results.forEach(r => {
      let icon = '✅';
      let color = 'var(--success)';
      if (r.percentage >= 90) {
        icon = '🏆';
        color = 'var(--warning)';
      } else if (r.percentage < 65) {
        icon = '📊';
        color = 'var(--primary)';
      }
      
      activitiesList.push({
        icon: icon,
        text: `Completed ${r.examTitle} quiz (Scored ${r.percentage}%)`,
        time: r.date || 'Recently',
        xp: r.xpEarned,
        color: color
      });
    });

    this.activities = activitiesList.slice(0, 4);
  }

  generateChartPoints(results: any[]): void {
    if (results.length === 0) {
      this.chartPoints = [{ label: 'Start', value: 0 }];
      return;
    }
    const sorted = [...results].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const points: ChartPoint[] = [{ label: 'Start', value: 0 }];
    let cumulativeXP = 0;
    sorted.forEach(r => {
      cumulativeXP += r.xpEarned;
      points.push({ label: r.date, value: cumulativeXP });
    });
    this.chartPoints = points;
  }

  loadRecommendations(): void {
    this.loadingRecommendations = true;
    this.aiService.getRecommendations().subscribe({
      next: (recs) => {
        this.recommendations = recs;
        this.loadingRecommendations = false;
      },
      error: () => {
        this.loadingRecommendations = false;
      }
    });
  }

  startCountdown(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.upcomingExam || !this.upcomingExam.scheduledAt) {
        this.countdown = { hrs: 0, min: 0, sec: 0 };
        return;
      }
      const now = new Date().getTime();
      const examTime = new Date(this.upcomingExam.scheduledAt).getTime();
      const diff = examTime - now;
      if (diff <= 0) {
        this.countdown = { hrs: 0, min: 0, sec: 0 };
        clearInterval(this.timer);
        // Refresh upcoming exam to transition its status and fetch next upcoming exam
        this.examService.getUpcomingExams().subscribe(exams => {
          this.upcomingExam = exams[0];
          if (this.upcomingExam) {
            this.startCountdown();
          }
        });
      } else {
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const min = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const sec = Math.floor((diff % (1000 * 60)) / 1000);
        this.countdown = { hrs, min, sec };
      }
    }, 1000);
  }

  // ── EVALUATOR FLOW ────────────────────────────────────────────────────────

  loadEvaluatorData(): void {
    this.loadingData = true;
    this.examService.getSubmissions().subscribe(subs => {
      this.submissions = subs;
      this.evaluatorStats.pendingReviews = subs.filter(s => s.status === 'PENDING').length;
      this.evaluatorStats.moderationsCount = subs.filter(s => s.status === 'APPROVED').length;
      this.generateSimilarityReports(subs);
    });

    this.examService.getTabSwitchLogs().subscribe(logs => {
      this.tabSwitchLogs = logs;
      this.evaluatorStats.tabSwitchesDetected = logs.reduce((sum, l) => sum + l.count, 0);
    });

    this.loadActiveSessions();
    this.loadAllExams();
  }

  get completedExamsList(): Exam[] {
    return this.allExams.filter(e => e.status === 'completed');
  }

  loadAllExams(): void {
    this.examService.getCategorizedExams().subscribe(cat => {
      this.allExams = [...cat.live, ...cat.upcoming, ...cat.completed];
      this.evaluatorStats.activeAssessments = this.allExams.length;
      this.adminStats.totalExams = this.allExams.length;
      this.loadingData = false;
    });
  }

  openReviewModal(sub: any): void {
    this.selectedSub = sub;
    this.modScore = sub.score;
    this.modFeedback = sub.feedback || '';
    this.showReviewModal = true;
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.selectedSub = null;
  }

  submitModeration(): void {
    if (!this.selectedSub) return;
    this.examService.moderateSubmission(this.selectedSub.id, this.modScore, this.modFeedback).subscribe(() => {
      this.loadEvaluatorData();
      this.closeReviewModal();
    });
  }

  generateSimilarityReports(subs: any[]): void {
    const reports: any[] = [];
    const groups: { [key: number]: any[] } = {};
    subs.forEach(s => {
      if (s.examId) {
        if (!groups[s.examId]) groups[s.examId] = [];
        groups[s.examId].push(s);
      }
    });

    Object.keys(groups).forEach(examIdStr => {
      const examSubs = groups[+examIdStr];
      for (let i = 0; i < examSubs.length; i++) {
        for (let j = i + 1; j < examSubs.length; j++) {
          const subA = examSubs[i];
          const subB = examSubs[j];
          const sim = this.calculateSimilarity(subA.code, subB.code);
          reports.push({
            id: `${subA.id}-${subB.id}`,
            examId: subA.examId,
            examTitle: subA.examTitle,
            candidateA: subA.candidateName,
            candidateB: subB.candidateName,
            similarity: sim,
            codeA: subA.code,
            codeB: subB.code,
            severity: sim >= 80 ? 'HIGH' : sim >= 50 ? 'MEDIUM' : 'LOW'
          });
        }
      }
    });
    this.similarityReports = reports.sort((a, b) => b.similarity - a.similarity);
  }

  calculateSimilarity(codeA: string, codeB: string): number {
    if (!codeA || !codeB) return 0;
    const extractChoices = (code: string) => {
      const lines = code.split('\n');
      return lines
        .filter(line => line.includes('Student Selection:'))
        .map(line => {
          const match = line.match(/Student Selection:\s*\[(.*?)\]/);
          return match ? match[1] : '';
        });
    };

    const choicesA = extractChoices(codeA);
    const choicesB = extractChoices(codeB);

    if (choicesA.length === 0 || choicesB.length === 0) return 0;

    let matches = 0;
    const minLen = Math.min(choicesA.length, choicesB.length);
    for (let i = 0; i < minLen; i++) {
      if (choicesA[i] === choicesB[i] && choicesA[i] !== 'Unanswered') {
        matches++;
      }
    }
    return Math.round((matches / minLen) * 100);
  }

  openCompareModal(report: any): void {
    this.selectedCompareReport = report;
    this.parseCompareQuestions(report);
    this.showCompareModal = true;
  }

  closeCompareModal(): void {
    this.showCompareModal = false;
    this.selectedCompareReport = null;
    this.compareQuestions = [];
  }

  parseCompareQuestions(report: any): void {
    const codeA = report.codeA;
    const codeB = report.codeB;
    if (!codeA || !codeB) {
      this.compareQuestions = [];
      return;
    }

    const parseLog = (code: string) => {
      const qs: any[] = [];
      const blocks = code.split(/Q\d+:/g);
      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const lines = block.split('\n');
        const text = lines[0].trim();
        
        let choice = 'Unanswered';
        const choiceLine = lines.find(l => l.includes('Student Selection:'));
        if (choiceLine) {
          const match = choiceLine.match(/Student Selection:\s*\[(.*?)\]/);
          choice = match ? match[1] : 'Unanswered';
        }

        let correct = '';
        const correctLine = lines.find(l => l.includes('Correct Answer:'));
        if (correctLine) {
          const match = correctLine.match(/Correct Answer:\s*\[(.*?)\]/);
          correct = match ? match[1] : '';
        }

        qs.push({ qNum: i, text, choice, correct });
      }
      return qs;
    };

    const qsA = parseLog(codeA);
    const qsB = parseLog(codeB);

    const compared: any[] = [];
    const minLen = Math.min(qsA.length, qsB.length);
    for (let i = 0; i < minLen; i++) {
      const qA = qsA[i];
      const qB = qsB[i];
      compared.push({
        qNum: qA.qNum,
        text: qA.text,
        choiceA: qA.choice,
        choiceB: qB.choice,
        correct: qA.correct,
        isMatch: qA.choice === qB.choice && qA.choice !== 'Unanswered',
        isSuspicious: qA.choice === qB.choice && qA.choice !== qA.correct && qA.choice !== 'Unanswered'
      });
    }
    this.compareQuestions = compared;
  }

  loadActiveSessions(): void {
    this.proctorService.getActiveSessions().subscribe(sessions => {
      this.activeSessions = sessions;
    });
  }

  warnStudent(session: any): void {
    const msg = prompt('Enter warning message to send to ' + session.studentName + ':');
    if (msg && msg.trim()) {
      this.proctorService.sendWarning(session.id, msg.trim()).subscribe(() => {
        this.loadActiveSessions();
      });
    }
  }

  togglePauseSession(session: any): void {
    this.proctorService.togglePause(session.id).subscribe(() => {
      this.loadActiveSessions();
    });
  }

  disqualifyStudent(session: any): void {
    if (confirm('Are you sure you want to DISQUALIFY ' + session.studentName + ' from the exam "' + session.examTitle + '"? This will end their attempt immediately.')) {
      this.proctorService.disqualify(session.id).subscribe(() => {
        this.loadActiveSessions();
      });
    }
  }

  // ── ADMIN FLOW ────────────────────────────────────────────────────────────

  loadAdminData(): void {
    this.loadingData = true;
    this.userService.getAllUsers().subscribe(users => {
      this.adminStats.totalUsers = users.length;
      this.adminStats.studentsCount = users.filter(u => u.role === 'STUDENT').length;
      this.adminStats.evaluatorsCount = users.filter(u => u.role === 'EVALUATOR').length;
    });

    this.loadAllExams();
    this.loadActiveSessions();
  }

  // Helper getters
  get chartMax(): number { 
    const max = Math.max(...this.chartPoints.map(p => p.value));
    return max > 0 ? max : 100;
  }

  isExamCompleted(examId: number): boolean {
    return this.examService.isExamCompleted(examId);
  }

  formatTime(seconds: number): string {
    if (!seconds && seconds !== 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getBarHeight(val: number): number { return (val / this.chartMax) * 100; }

  getSVGPath(): string {
    const w = 700, h = 200, max = this.chartMax, pts = this.chartPoints;
    if (pts.length < 2) {
      return `M 0 ${h - 10} L ${w} ${h - 10}`;
    }
    const xs = pts.map((_, i) => (i / (pts.length - 1)) * w);
    const ys = pts.map(p => h - (p.value / max) * (h - 20) - 10);
    let d = `M ${xs[0]} ${ys[0]}`;
    for (let i = 1; i < pts.length; i++) {
      const cpx = (xs[i-1] + xs[i]) / 2;
      d += ` C ${cpx} ${ys[i-1]}, ${cpx} ${ys[i]}, ${xs[i]} ${ys[i]}`;
    }
    return d;
  }

  getSVGArea(): string {
    const w = 700, h = 200;
    return this.getSVGPath() + ` L ${w} ${h} L 0 ${h} Z`;
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }
}
