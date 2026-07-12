import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

interface NavItem { icon: string; label: string; route: string; badge?: string; section: string; roles?: string[]; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  navItems: NavItem[] = [
    { icon: '🏠', label: 'Dashboard', route: '/dashboard', section: 'MAIN' },
    { icon: '🔴', label: 'Live Exams', route: '/live-exams', badge: 'LIVE', section: 'EXAMS' },
    { icon: '📅', label: 'Upcoming Exams', route: '/upcoming-exams', section: 'EXAMS' },
    { icon: '📋', label: 'My Exams', route: '/my-exams', section: 'EXAMS', roles: ['STUDENT'] },
    { icon: '📝', label: 'AI Mock Quiz', route: '/practice-mcq', section: 'EXAMS', roles: ['STUDENT'] },
    { icon: '➕', label: 'Create Exam', route: '/create-exam', section: 'EXAMS', roles: ['EVALUATOR', 'ADMIN'] },
    { icon: '📅', label: 'Exam Orchestrator', route: '/exam-orchestrator', section: 'GOVERNANCE', roles: ['ADMIN'] },
    { icon: '👥', label: 'User Registry', route: '/user-registry', section: 'GOVERNANCE', roles: ['ADMIN'] },
    { icon: '📊', label: 'My Results', route: '/my-results', section: 'RESULTS', roles: ['STUDENT'] },
    { icon: '🏆', label: 'Leaderboard', route: '/leaderboard', section: 'LEADERBOARD' },
    { icon: '👤', label: 'Profile', route: '/profile', section: 'PROFILE' },
  ];

  get sections(): string[] {
    const userRole = this.authService.getUser()?.role;
    if (userRole === 'ADMIN') {
      return ['MAIN', 'GOVERNANCE', 'EXAMS', 'RESULTS', 'LEADERBOARD', 'PROFILE'];
    }
    if (userRole === 'EVALUATOR') {
      return ['MAIN', 'EXAMS', 'RESULTS', 'LEADERBOARD', 'PROFILE'];
    }
    return ['MAIN', 'EXAMS', 'RESULTS', 'LEADERBOARD', 'PROFILE'];
  }

  constructor(public authService: AuthService) {}

  getItemsBySection(section: string): NavItem[] {
    const role = this.authService.getUser()?.role || 'STUDENT';
    return this.navItems.filter(i => {
      if (i.section !== section) return false;
      if (i.roles && !i.roles.includes(role)) return false;
      return true;
    });
  }

  logout(): void { this.authService.logout(); }
}
