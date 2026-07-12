import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';
import { roleGuard } from './services/role.guard';
import { LoginComponent } from './pages/login/login.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { LiveExamsComponent } from './pages/live-exams/live-exams.component';
import { UpcomingExamsComponent } from './pages/upcoming-exams/upcoming-exams.component';
import { MyExamsComponent } from './pages/my-exams/my-exams.component';
import { CompletedExamsComponent } from './pages/completed-exams/completed-exams.component';
import { PracticeMcqComponent } from './pages/practice-mcq/practice-mcq.component';
import { LeaderboardComponent } from './pages/leaderboard/leaderboard.component';
import { MyResultsComponent } from './pages/my-results/my-results.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { CreateExamComponent } from './pages/create-exam/create-exam.component';
import { ConductExamComponent } from './pages/conduct-exam/conduct-exam.component';
import { ExamOrchestratorComponent } from './pages/exam-orchestrator/exam-orchestrator.component';
import { UserRegistryComponent } from './pages/user-registry/user-registry.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'live-exams', component: LiveExamsComponent, canActivate: [authGuard] },
  { path: 'upcoming-exams', component: UpcomingExamsComponent, canActivate: [authGuard] },
  { path: 'my-exams', component: MyExamsComponent, canActivate: [authGuard] },
  { path: 'completed-exams', component: CompletedExamsComponent, canActivate: [authGuard] },
  { path: 'practice-mcq', component: PracticeMcqComponent, canActivate: [authGuard] },
  { path: 'conduct-exam', component: ConductExamComponent, canActivate: [authGuard] },
  { path: 'create-exam', component: CreateExamComponent, canActivate: [authGuard, roleGuard], data: { expectedRoles: ['EVALUATOR', 'ADMIN'] } },
  { path: 'exam-orchestrator', component: ExamOrchestratorComponent, canActivate: [authGuard, roleGuard], data: { expectedRoles: ['ADMIN'] } },
  { path: 'user-registry', component: UserRegistryComponent, canActivate: [authGuard, roleGuard], data: { expectedRoles: ['ADMIN'] } },
  { path: 'leaderboard', component: LeaderboardComponent, canActivate: [authGuard] },
  { path: 'my-results', component: MyResultsComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/dashboard' }
];
