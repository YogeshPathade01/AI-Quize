import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/layout/topbar/topbar.component';
import { ExamService, Question } from '../../services/exam.service';
import { AiService } from '../../services/ai.service';
import { AiAssistantComponent } from '../../components/ai-assistant/ai-assistant.component';

@Component({
  selector: 'app-practice-mcq',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent, AiAssistantComponent],
  templateUrl: './practice-mcq.component.html',
  styleUrls: ['./practice-mcq.component.scss']
})
export class PracticeMcqComponent implements OnInit {
  @ViewChild(AiAssistantComponent) aiAssistant!: AiAssistantComponent;

  questions: Question[] = [];
  currentIndex = 0;
  selectedOption: number | null = null;
  answered = false;
  score = 0;
  completed = false;

  // AI Quiz Generation fields
  aiTopic = '';
  aiDifficulty = 'Medium';
  aiNumQuestions = 5;
  generatingQuiz = false;
  aiGenerationError = '';

  constructor(
    private examService: ExamService, 
    private aiService: AiService,
    private route: ActivatedRoute
  ) {}
  
  ngOnInit(): void { 
    this.route.queryParams.subscribe(params => {
      const topic = params['aiTopic'];
      const diff = params['aiDifficulty'] || 'Medium';
      if (topic) {
        this.aiTopic = topic;
        this.aiDifficulty = diff;
        this.aiNumQuestions = 5;
        this.generateAiQuiz();
      } else {
        this.questions = [];
      }
    });
  }

  get currentQ(): Question { return this.questions[this.currentIndex]; }
  get progress(): number { return ((this.currentIndex + 1) / this.questions.length) * 100; }

  selectOption(i: number): void { 
    if (!this.answered) { 
      this.selectedOption = i; 
      this.answered = true; 
      if (i === this.currentQ.correctIndex) this.score++; 
      // If AI Assistant is open, update explanation to reflect selected option
      if (this.aiAssistant && this.aiAssistant.isOpen) {
        setTimeout(() => this.aiAssistant.resetChat(), 200);
      }
    } 
  }
  isCorrect(i: number): boolean { return i === this.currentQ.correctIndex; }
  isWrong(i: number): boolean { return this.answered && i === this.selectedOption && i !== this.currentQ.correctIndex; }

  next(): void {
    if (this.currentIndex < this.questions.length - 1) { 
      this.currentIndex++; 
      this.selectedOption = null; 
      this.answered = false; 
      if (this.aiAssistant) this.aiAssistant.resetChat();
    }
    else { this.completed = true; }
  }

  reset(): void { 
    this.currentIndex = 0; 
    this.selectedOption = null; 
    this.answered = false; 
    this.score = 0; 
    this.completed = false; 
    if (this.aiAssistant) this.aiAssistant.resetChat();
  }
  getScoreColor(): string { const p = this.score / this.questions.length; return p >= 0.8 ? 'var(--success)' : p >= 0.5 ? 'var(--warning)' : 'var(--danger)'; }

  explainWithAi(): void {
    if (this.aiAssistant) {
      this.aiAssistant.openAndExplain();
    }
  }

  generateAiQuiz(): void {
    if (!this.aiTopic.trim()) return;
    this.generatingQuiz = true;
    this.aiGenerationError = '';
    this.aiService.generateQuiz(this.aiTopic, this.aiDifficulty, this.aiNumQuestions).subscribe({
      next: (exam) => {
        this.examService.getExamQuestions(exam.id).subscribe({
          next: (q) => {
            this.generatingQuiz = false;
            this.questions = q;
            this.reset();
            this.aiTopic = '';
          },
          error: () => {
            this.generatingQuiz = false;
            this.aiGenerationError = 'Could not load generated questions.';
          }
        });
      },
      error: () => {
        this.generatingQuiz = false;
        this.aiGenerationError = 'AI Quiz Generation failed. Check backend/API key.';
      }
    });
  }
}
