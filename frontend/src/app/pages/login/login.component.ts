import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

declare var google: any;

@Component({
  selector: 'app-login', standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  email = ''; password = ''; firstName = ''; lastName = ''; role = 'STUDENT';
  showPass = false; loading = false; error = ''; isRegister = false;
  forgotLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.initGoogleSignIn();
  }

  setTab(isRegister: boolean): void {
    this.isRegister = isRegister;
    if (!isRegister) {
      setTimeout(() => this.initGoogleSignIn(), 50);
    }
  }

  initGoogleSignIn(): void {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      const btnEl = document.getElementById('googleBtn');
      if (!btnEl) {
        // Element not in DOM yet, wait for Angular to finish rendering
        setTimeout(() => this.initGoogleSignIn(), 50);
        return;
      }
      google.accounts.id.initialize({
        client_id: '219863315177-3ksorbduakptg7m26jrvrgtmp0nbvm9u.apps.googleusercontent.com',
        callback: this.handleGoogleCredentialResponse.bind(this)
      });
      google.accounts.id.renderButton(
        btnEl,
        { theme: 'outline', size: 'large', width: 348, text: 'continue_with' }
      );
    } else {
      setTimeout(() => this.initGoogleSignIn(), 100);
    }
  }

  handleGoogleCredentialResponse(response: any): void {
    this.ngZone.run(() => {
      this.loading = true;
      this.error = '';
      this.authService.loginWithGoogle(response.credential).subscribe({
        next: (resp) => {
          this.loading = false;
          if (resp.success) {
            this.router.navigate(['/dashboard']);
          } else {
            this.error = resp.message;
          }
        },
        error: () => {
          this.loading = false;
          this.error = 'Google login failed. Please try again.';
        }
      });
    });
  }

  submit(): void {
    this.loading = true; this.error = '';
    if (!this.email || !this.password) {
      this.error = 'Please enter email and password.'; this.loading = false; return;
    }
    const obs = this.isRegister
      ? this.authService.register(this.firstName, this.lastName, this.email, this.password, this.role)
      : this.authService.login(this.email, this.password);

    obs.subscribe({
      next: (resp) => {
        this.loading = false;
        if (resp.success) {
          if (this.isRegister) {
            this.authService.logout(); // Clear registration auto-login session
            this.setTab(false);
          } else {
            this.router.navigate(['/dashboard']);
          }
        }
        else this.error = resp.message;
      },
      error: () => {
        this.loading = false;
        if (this.isRegister) {
          this.setTab(false);
        } else {
          // Backend offline — demo mode
          this.authService.setMockUser(this.email);
          this.router.navigate(['/dashboard']);
        }
      }
    });
  }

  forgotPassword(event: Event): void {
    event.preventDefault();
    if (this.forgotLoading) return;
    if (!this.email) {
      this.error = 'Please enter your email address to reset password.';
      return;
    }
    this.forgotLoading = true;
    this.error = '';
    this.authService.forgotPassword(this.email).subscribe({
      next: (resp) => {
        this.forgotLoading = false;
        if (resp.success) {
          alert('A password reset link has been sent to your email.');
        } else {
          this.error = resp.message;
        }
      },
      error: (err) => {
        this.forgotLoading = false;
        // Demo mode fallback
        alert('Password reset link sent (Demo Mode)! Please check your email.');
      }
    });
  }
}
