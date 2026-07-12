import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/layout/topbar/topbar.component';
import { AuthService, User } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  user: User | null = null;
  editMode = false;
  editName = '';
  loading = false;
  error = '';
  success = '';
  private sub: Subscription | null = null;

  subjects = [
    { name: 'Data Structures', pct: 82, color: 'var(--primary)' },
    { name: 'Python', pct: 91, color: 'var(--success)' },
    { name: 'SQL', pct: 74, color: 'var(--warning)' },
    { name: 'OOP Concepts', pct: 68, color: 'var(--danger)' }
  ];
  recentActivity = [
    { text: 'Completed Data Structures MCQ', date: '18 May', xp: 240 },
    { text: 'Python Basics Test', date: '15 May', xp: 180 },
    { text: 'SQL Advanced Quiz', date: '10 May', xp: 120 }
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.sub = this.authService.user$.subscribe(u => {
      this.user = u;
      if (u && !this.editMode) {
        this.editName = u.name;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.sub) this.sub.unsubscribe();
  }

  startEdit(): void {
    this.error = '';
    this.success = '';
    this.editName = this.user?.name || '';
    this.editMode = true;
  }

  saveChanges(): void {
    this.error = '';
    this.success = '';
    
    if (!this.editName.trim()) {
      this.error = 'Full name cannot be empty.';
      return;
    }

    const parts = this.editName.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    this.loading = true;
    this.authService.updateProfile(firstName, lastName).subscribe({
      next: (resp) => {
        this.loading = false;
        if (resp.success) {
          this.success = 'Profile updated successfully!';
          setTimeout(() => {
            this.editMode = false;
            this.success = '';
          }, 1500);
        } else {
          this.error = resp.message || 'Failed to update profile.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Something went wrong. Please try again.';
      }
    });
  }

  getInitials(n: string): string {
    if (!n) return '';
    return n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  }
  xpToNextLevel(): number { return 2000 - (this.user?.xp || 0); }
  xpProgress(): number { return ((this.user?.xp || 0) / 2000) * 100; }
}
