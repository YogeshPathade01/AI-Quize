import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/layout/topbar/topbar.component';
import { AuthService } from '../../services/auth.service';
import { ExamService } from '../../services/exam.service';

interface QuestionDraft {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOptionIndex: number;
  explanation: string;
  difficulty: string;
}

@Component({
  selector: 'app-create-exam',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent, TopbarComponent],
  templateUrl: './create-exam.component.html',
  styleUrls: ['./create-exam.component.scss']
})
export class CreateExamComponent implements OnInit {
  exam = {
    title: '',
    subject: '',
    description: '',
    duration: 30,
    difficulty: 'MEDIUM',
    status: 'UPCOMING',
    scheduledAt: '',
    questions: [] as QuestionDraft[]
  };

  loading = false;
  error = '';
  success = '';

  isEditMode = false;
  editExamId: number | null = null;

  constructor(
    private authService: AuthService,
    private examService: ExamService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (!user || (user.role !== 'EVALUATOR' && user.role !== 'ADMIN')) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.route.queryParams.subscribe(params => {
      const examId = params['examId'];
      if (examId) {
        this.isEditMode = true;
        this.editExamId = +examId;
        this.loadExamData(this.editExamId);
      } else {
        this.isEditMode = false;
        // Initialize with 1 default question
        this.addQuestion();
        
        // Set default date-time to tomorrow in local timezone
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const tzOffset = tomorrow.getTimezoneOffset() * 60000;
        this.exam.scheduledAt = new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
      }
    });
  }

  loadExamData(examId: number): void {
    this.loading = true;
    this.examService.getExamById(examId).subscribe({
      next: (examData) => {
        this.exam.title = examData.title;
        this.exam.subject = examData.subject;
        this.exam.description = examData.description || '';
        this.exam.duration = examData.duration;
        this.exam.difficulty = examData.difficulty.toUpperCase();
        
        if (examData.scheduledAt) {
          const date = new Date(examData.scheduledAt);
          const tzOffset = date.getTimezoneOffset() * 60000;
          this.exam.scheduledAt = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
        }

        this.examService.getExamQuestions(examId).subscribe({
          next: (questions) => {
            if (questions && questions.length > 0) {
              this.exam.questions = questions.map(q => ({
                text: q.text,
                optionA: q.options[0] || '',
                optionB: q.options[1] || '',
                optionC: q.options[2] || '',
                optionD: q.options[3] || '',
                correctOptionIndex: q.correctIndex,
                explanation: q.explanation || '',
                difficulty: 'MEDIUM'
              }));
            } else {
              this.exam.questions = [];
              this.addQuestion();
            }
            this.loading = false;
          },
          error: () => {
            this.loading = false;
            this.error = 'Failed to load exam questions.';
          }
        });
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to load exam details.';
      }
    });
  }

  addQuestion(): void {
    this.exam.questions.push({
      text: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOptionIndex: 0,
      explanation: '',
      difficulty: 'MEDIUM'
    });
  }

  removeQuestion(index: number): void {
    if (this.exam.questions.length > 1) {
      this.exam.questions.splice(index, 1);
    } else {
      this.error = 'An exam must contain at least one question.';
      setTimeout(() => this.error = '', 3000);
    }
  }

  validate(): boolean {
    if (!this.exam.title.trim()) {
      this.error = 'Exam Title is required.';
      return false;
    }
    if (!this.exam.subject.trim()) {
      this.error = 'Subject is required.';
      return false;
    }
    if (this.exam.duration <= 0) {
      this.error = 'Duration must be greater than 0 minutes.';
      return false;
    }
    if (!this.exam.scheduledAt) {
      this.error = 'Scheduled Date & Time is required.';
      return false;
    }

    for (let i = 0; i < this.exam.questions.length; i++) {
      const q = this.exam.questions[i];
      if (!q.text.trim()) {
        this.error = `Question ${i + 1} has no text.`;
        return false;
      }
      if (!q.optionA.trim() || !q.optionB.trim() || !q.optionC.trim() || !q.optionD.trim()) {
        this.error = `Question ${i + 1} must have all 4 options filled out.`;
        return false;
      }
    }

    this.error = '';
    return true;
  }

  onSubmit(): void {
    if (!this.validate()) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    const payload = {
      ...this.exam,
      scheduledAt: this.exam.scheduledAt
    };

    const action = this.isEditMode
      ? this.examService.updateExam(this.editExamId!, payload)
      : this.examService.createExam(payload);

    action.subscribe({
      next: (resp) => {
        this.loading = false;
        if (resp.success || resp.id) {
          this.success = this.isEditMode
            ? 'Exam and questions updated successfully!'
            : 'Exam and questions created successfully!';
          const createdStatus = (resp.data?.status || '').toUpperCase();
          setTimeout(() => {
            if (createdStatus === 'LIVE') {
              this.router.navigate(['/live-exams']);
            } else {
              this.router.navigate(['/upcoming-exams']);
            }
          }, 1500);
        } else {
          this.error = resp.message || 'Failed to save exam.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Something went wrong. Please check your inputs.';
      }
    });
  }
}
