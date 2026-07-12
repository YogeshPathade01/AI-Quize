import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/layout/topbar/topbar.component';
import { UserService } from '../../services/user.service';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-user-registry',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './user-registry.component.html',
  styleUrls: ['./user-registry.component.scss']
})
export class UserRegistryComponent implements OnInit {
  user: User | null = null;
  usersList: any[] = [];
  filteredUsers: any[] = [];
  searchQuery = '';
  loadingData = false;

  userStats = {
    totalUsers: 0,
    studentsCount: 0,
    evaluatorsCount: 0
  };

  showUserModal = false;
  selectedUser: any = null;

  // Form State
  editFirstName = '';
  editLastName = '';
  editEmail = '';
  editLevel = 1;
  editXp = 0;
  editStreak = 0;
  editRole = 'STUDENT';

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {
    this.user = this.authService.getUser();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loadingData = true;
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.usersList = users;
        this.userStats.totalUsers = users.length;
        this.userStats.studentsCount = users.filter(u => u.role === 'STUDENT').length;
        this.userStats.evaluatorsCount = users.filter(u => u.role === 'EVALUATOR').length;
        this.onSearchChange();
        this.loadingData = false;
      },
      error: (err) => {
        console.error('Failed to load users', err);
        this.loadingData = false;
      }
    });
  }

  onSearchChange(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredUsers = this.usersList;
    } else {
      this.filteredUsers = this.usersList.filter(u =>
        (u.firstName || '').toLowerCase().includes(query) ||
        (u.lastName || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query)
      );
    }
  }

  openUserModal(user: any): void {
    this.selectedUser = user;
    this.editFirstName = user.firstName;
    this.editLastName = user.lastName;
    this.editEmail = user.email;
    this.editLevel = user.level || 1;
    this.editXp = user.xp || 0;
    this.editStreak = user.streak || 0;
    this.editRole = user.role;
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.selectedUser = null;
  }

  saveUserDetails(): void {
    if (!this.selectedUser) return;
    const details = {
      id: this.selectedUser.id,
      firstName: this.editFirstName,
      lastName: this.editLastName,
      email: this.editEmail,
      level: this.editLevel,
      xp: this.editXp,
      streak: this.editStreak,
      role: this.editRole
    };
    this.userService.updateUser(this.selectedUser.id, details).subscribe({
      next: () => {
        this.loadUsers();
        this.closeUserModal();
      },
      error: (err) => {
        console.error('Failed to update user details', err);
      }
    });
  }

  deleteUserAccount(): void {
    if (!this.selectedUser) return;
    if (this.selectedUser.email === this.user?.email) {
      alert('You cannot delete your own admin account!');
      return;
    }
    if (confirm(`Are you sure you want to permanently delete the account for ${this.selectedUser.firstName} ${this.selectedUser.lastName}?`)) {
      this.userService.deleteUser(this.selectedUser.id).subscribe({
        next: () => {
          this.loadUsers();
          this.closeUserModal();
        },
        error: (err) => {
          console.error('Failed to delete user account', err);
        }
      });
    }
  }
}
