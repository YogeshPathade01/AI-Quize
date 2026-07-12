import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ExamService, Question } from '../../services/exam.service';
import { AuthService } from '../../services/auth.service';
import { ProctorService } from '../../services/proctor.service';

@Component({
  selector: 'app-conduct-exam',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './conduct-exam.component.html',
  styleUrls: ['./conduct-exam.component.scss']
})
export class ConductExamComponent implements OnInit, OnDestroy {
  examId: number | null = null;
  examTitle = '';
  examSubject = '';
  examDuration = 0;
  
  questions: Question[] = [];
  currentIndex = 0;
  selectedOption: number | null = null;
  answered = false;
  score = 0;
  completed = false;
  
  tabSwitches = 0;
  userChoices: number[] = [];
  
  // Timer properties
  timeRemaining = 0; // in seconds
  private timerInterval: any;
  Math = Math;

  proctorSessionId: number | null = null;
  isPausedByProctor = false;
  lastWarningMessage: string | null = null;
  private heartbeatInterval: any;
  
  constructor(
    private examService: ExamService,
    private authService: AuthService,
    private proctorService: ProctorService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  @HostListener('document:visibilitychange', [])
  onVisibilityChange() {
    if (document.hidden && !this.completed) {
      this.tabSwitches++;
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any) {
    if (!this.completed) {
      $event.returnValue = 'Are you sure you want to leave? Your exam attempt will be finalized and you will not be able to join again.';
      return $event.returnValue;
    }
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const id = params['examId'];
      if (id) {
        this.examId = +id;
        if (this.examService.isExamCompleted(this.examId)) {
          alert('You have already started or submitted this exam! Multiple attempts are not allowed.');
          this.router.navigate(['/dashboard']);
          return;
        }

        // Immediately record the attempt in localStorage so they cannot re-enter if they reload/refresh
        const completedIds = JSON.parse(localStorage.getItem('iq_completed_exam_ids') || '[]');
        if (!completedIds.includes(this.examId)) {
          completedIds.push(this.examId);
          localStorage.setItem('iq_completed_exam_ids', JSON.stringify(completedIds));
        }
        
        this.loadExamData(this.examId);
      } else {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  loadExamData(examId: number): void {
    this.examService.getExamById(examId).subscribe(exam => {
      if (exam) {
        this.examTitle = exam.title;
        this.examSubject = exam.subject;
        this.examDuration = exam.duration;
        this.timeRemaining = exam.duration * 60; // Convert to seconds
        this.startTimer();
        this.startProctorSession(examId, exam.title, exam.totalQuestions);
      }
    });

    this.examService.getExamQuestions(examId).subscribe(q => {
      if (q && q.length > 0) {
        this.questions = q;
        this.reset();
      } else {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  startProctorSession(examId: number, examTitle: string, totalQuestions: number): void {
    this.proctorService.createSession(examId, examTitle, totalQuestions, this.timeRemaining).subscribe({
      next: (session) => {
        if (session) {
          this.proctorSessionId = session.id;
          this.startHeartbeat();
        }
      }
    });
  }

  startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.heartbeatInterval = setInterval(() => {
      if (!this.proctorSessionId || this.completed) return;

      this.proctorService.updateSession(
        this.proctorSessionId, this.currentIndex, this.tabSwitches, this.timeRemaining
      ).subscribe({
        next: (session) => {
          if (session) {
            this.isPausedByProctor = session.isPaused;

            if (session.isDisqualified) {
              clearInterval(this.heartbeatInterval);
              clearInterval(this.timerInterval);
              this.completed = true;
              alert('DISQUALIFIED:\n\nYou have been disqualified from this exam by the proctor.');
              this.router.navigate(['/dashboard']);
              return;
            }

            if (session.warningMessage && session.warningMessage !== this.lastWarningMessage) {
              this.lastWarningMessage = session.warningMessage;
              alert('PROCTOR WARNING:\n\n' + session.warningMessage);
            }
          }
        }
      });
    }, 3000);
  }

  startTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timerInterval = setInterval(() => {
      if (this.isPausedByProctor) return;
      
      if (this.timeRemaining > 0 && !this.completed) {
        this.timeRemaining--;
      } else if (this.timeRemaining === 0 && !this.completed) {
        this.completed = true;
        this.submitExamResults();
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  get currentQ(): Question {
    return this.questions[this.currentIndex];
  }

  get progress(): number {
    if (this.questions.length === 0) return 0;
    return ((this.currentIndex + 1) / this.questions.length) * 100;
  }

  selectOption(i: number): void {
    if (!this.completed) {
      this.selectedOption = i;
      this.answered = true;
      this.userChoices[this.currentIndex] = i;
    }
  }

  next(): void {
    // Grade the current question (calculated locally, evaluated by evaluator later)
    const currentQ = this.currentQ;
    const selection = this.userChoices[this.currentIndex];
    if (selection === currentQ.correctIndex) {
      this.score++;
    }

    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
      this.selectedOption = null;
      this.answered = false;
    } else {
      this.completed = true;
      this.submitExamResults();
    }
  }

  reset(): void {
    this.currentIndex = 0;
    this.selectedOption = null;
    this.answered = false;
    this.score = 0;
    this.completed = false;
    this.tabSwitches = 0;
    this.userChoices = [];
  }

  submitExamResults(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.proctorSessionId) {
      this.proctorService.submitSession(this.proctorSessionId).subscribe();
    }

    const user = this.authService.getUser();
    const candidateName = user ? user.name : 'Anonymous Student';
    
    // Generate answers log for evaluator
    let summaryText = `EXAM LOG FOR ${candidateName.toUpperCase()}\n`;
    summaryText += `Exam ID: ${this.examId}\n`;
    summaryText += `Exam Title: ${this.examTitle || 'Live Assessment'}\n`;
    summaryText += `Candidate: ${candidateName}\n`;
    summaryText += `Score: ${this.score} / ${this.questions.length} (${Math.round((this.score / this.questions.length) * 100)}%)\n`;
    summaryText += `Tab Switches (Potential Violations): ${this.tabSwitches}\n\n`;
    summaryText += `--- QUESTION BY QUESTION BREAKDOWN ---\n`;
    
    this.questions.forEach((q, index) => {
      const uChoice = this.userChoices[index];
      const uChoiceStr = uChoice !== undefined && uChoice !== null ? String.fromCharCode(65 + uChoice) : 'Unanswered';
      const cChoiceStr = String.fromCharCode(65 + q.correctIndex);
      
      summaryText += `Q${index + 1}: ${q.text}\n`;
      q.options.forEach((opt, oIdx) => {
        const marker = oIdx === q.correctIndex ? '✔' : (oIdx === uChoice ? '✘' : ' ');
        summaryText += `  [${marker}] [${String.fromCharCode(65 + oIdx)}] ${opt}\n`;
      });
      summaryText += `  Student Selection: [${uChoiceStr}] ${uChoice !== undefined && uChoice !== null ? q.options[uChoice] : ''}\n`;
      summaryText += `  Correct Answer: [${cChoiceStr}] ${q.options[q.correctIndex]}\n`;
      summaryText += `  Status: ${uChoice === q.correctIndex ? 'CORRECT (1 mark)' : 'INCORRECT (0 marks)'}\n\n`;
    });

    // Create the evaluator submission entry
    const submissionId = Math.floor(Math.random() * 90000) + 10000;
    const newSubmission = {
      id: submissionId,
      candidateName: candidateName,
      examId: this.examId,
      examTitle: this.examTitle || 'Live Assessment',
      problemName: 'Assessment Quiz',
      language: 'MCQ',
      score: Math.round((this.score / this.questions.length) * 100),
      tabSwitches: this.tabSwitches,
      status: 'PENDING',
      code: summaryText
    };

    // Submit candidate submission to backend (with local fallback handled in the service)
    this.examService.submitSubmission(newSubmission).subscribe({
      next: (resp) => {
        console.log('Submission saved:', resp);
      },
      error: (err) => {
        console.error('Failed to submit detailed logs:', err);
      }
    });

    // Save tab switch log if there were tab switches
    const tabSwitchSeverity = this.tabSwitches > 5 ? 'HIGH' : (this.tabSwitches > 0 ? 'MEDIUM' : 'NONE');
    if (this.tabSwitches > 0) {
      const newTabSwitchLog = {
        candidateName: candidateName,
        examTitle: this.examTitle || 'Live Assessment',
        count: this.tabSwitches,
        severity: tabSwitchSeverity,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      const currentLogs = JSON.parse(localStorage.getItem('iq_local_tab_switch_logs') || '[]');
      currentLogs.push(newTabSwitchLog);
      localStorage.setItem('iq_local_tab_switch_logs', JSON.stringify(currentLogs));
    }

    // Move the exam status to completed locally so it won't appear in upcoming/live lists
    const localExams = JSON.parse(localStorage.getItem('iq_local_exams') || '[]');
    const localExam = localExams.find((e: any) => e.id === this.examId);
    if (localExam) {
      localExam.status = 'completed';
      localStorage.setItem('iq_local_exams', JSON.stringify(localExams));
    }

    // Save to completed exam IDs in localStorage to prevent repeat attempts
    const completedIds = JSON.parse(localStorage.getItem('iq_completed_exam_ids') || '[]');
    if (this.examId && !completedIds.includes(this.examId)) {
      completedIds.push(this.examId);
      localStorage.setItem('iq_completed_exam_ids', JSON.stringify(completedIds));
    }

    // Submit result to backend database
    if (this.examId) {
      const timeTaken = (this.examDuration * 60) - this.timeRemaining;
      this.examService.submitResult(this.examId, this.score, this.questions.length, timeTaken).subscribe({
        next: (resp) => {
          console.log('Exam result submitted to backend:', resp);
        },
        error: (err) => {
          console.error('Failed to submit exam result to backend:', err);
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
  }
}
