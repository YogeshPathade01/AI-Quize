import { Component, Input, HostListener, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../../services/auth.service';
import { ExamService, Exam } from '../../../services/exam.service';
import { NotificationService, Notification } from '../../../services/notification.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit {
  @Input() pageTitle = 'Dashboard';
  @Input() pageSubtitle = '';
  
  showNotifications = false;
  searchQuery = '';
  user: User | null;

  notifications: Notification[] = [];

  subjects = ['DSA', 'Java', 'Python', 'SQL', 'Web Dev', 'OOP'];
  allExams: Exam[] = [];
  searchResults: { exams: Exam[], subjects: string[] } = { exams: [], subjects: [] };
  showSearchResults = false;

  constructor(
    private authService: AuthService, 
    private examService: ExamService,
    private notificationService: NotificationService,
    private elRef: ElementRef
  ) {
    this.user = authService.getUser();
  }

  ngOnInit(): void {
    // Load exams to search through
    this.examService.getLiveExams().subscribe(exams => this.allExams.push(...exams));
    this.examService.getUpcomingExams().subscribe(exams => this.allExams.push(...exams));
    // Load real notifications
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe(n => this.notifications = n);
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showSearchResults = false;
  }

  markAsRead(notif: Notification): void {
    this.notificationService.markRead(notif.id).subscribe(() => {
      notif.read = true;
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllRead().subscribe(() => {
      this.notifications.forEach(n => n.read = true);
    });
  }

  dismissNotification(notif: Notification, event: MouseEvent): void {
    event.stopPropagation();
    this.notificationService.dismiss(notif.id).subscribe(() => {
      this.notifications = this.notifications.filter(n => n.id !== notif.id);
    });
  }

  onSearchChange(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (query.length < 2) {
      this.searchResults = { exams: [], subjects: [] };
      this.showSearchResults = false;
      return;
    }

    const matchedExams = this.allExams.filter(e => 
      e.title.toLowerCase().includes(query) || 
      e.subject.toLowerCase().includes(query)
    );

    const matchedSubjects = this.subjects.filter(s => 
      s.toLowerCase().includes(query)
    );

    this.searchResults = {
      exams: matchedExams.slice(0, 4),
      subjects: matchedSubjects.slice(0, 3)
    };
    
    this.showSearchResults = this.searchResults.exams.length > 0 || this.searchResults.subjects.length > 0;
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = { exams: [], subjects: [] };
    this.showSearchResults = false;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.showNotifications = false;
      this.showSearchResults = false;
    }
  }

  getInitials(name: string): string {
    return (name || 'Student').split(' ').map(n => n ? n[0] : '').join('').toUpperCase().slice(0, 2);
  }

  logout(): void { this.authService.logout(); }
}
