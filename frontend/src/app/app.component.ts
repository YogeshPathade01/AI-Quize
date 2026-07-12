import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>'
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    // Clear old local storage dummy/mock exam data
    localStorage.removeItem('iq_local_exams');
    localStorage.removeItem('iq_local_submissions');
    localStorage.removeItem('iq_local_users');
    localStorage.removeItem('iq_local_tab_switch_logs');
    
    // Clear any local questions keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('iq_local_questions_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }
}
