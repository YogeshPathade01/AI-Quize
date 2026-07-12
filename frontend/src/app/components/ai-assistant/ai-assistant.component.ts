import { Component, Input, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../services/ai.service';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  formattedText?: string;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.scss']
})
export class AiAssistantComponent implements AfterViewChecked {
  @Input() questionText = '';
  @Input() options: string[] = [];
  @Input() correctIndex = 0;
  @Input() selectedIndex: number | null = null;

  @ViewChild('chatScroll') private chatScrollContainer!: ElementRef;

  isOpen = false;
  chatHistory: ChatMessage[] = [];
  userInput = '';
  loading = false;

  constructor(private aiService: AiService) {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  openAndExplain(): void {
    this.isOpen = true;
    if (this.chatHistory.length === 0) {
      this.fetchExplanation();
    }
  }

  close(): void {
    this.isOpen = false;
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.openAndExplain();
    }
  }

  resetChat(): void {
    this.chatHistory = [];
    this.userInput = '';
    if (this.isOpen) {
      this.fetchExplanation();
    }
  }

  private fetchExplanation(): void {
    this.loading = true;
    this.aiService.explainQuestion(
      this.questionText,
      this.options,
      this.correctIndex,
      this.selectedIndex,
      []
    ).subscribe({
      next: (resp) => {
        this.loading = false;
        const msg: ChatMessage = {
          role: 'model',
          text: resp,
          formattedText: this.parseMarkdown(resp)
        };
        this.chatHistory.push(msg);
        this.scrollToBottom();
      },
      error: () => {
        this.loading = false;
        const errorMsg = "Sorry, I couldn't reach the AI service right now. Please check if the backend is running or try again later.";
        this.chatHistory.push({
          role: 'model',
          text: errorMsg,
          formattedText: errorMsg
        });
      }
    });
  }

  sendMessage(): void {
    if (!this.userInput.trim() || this.loading) return;

    const userText = this.userInput.trim();
    this.userInput = '';

    // Add user message to local chat history
    this.chatHistory.push({
      role: 'user',
      text: userText,
      formattedText: userText
    });
    this.scrollToBottom();

    // Map history to backend DTO format
    const historyPayload = this.chatHistory.map(c => ({
      role: c.role,
      text: c.text
    }));

    this.loading = true;
    this.aiService.explainQuestion(
      this.questionText,
      this.options,
      this.correctIndex,
      this.selectedIndex,
      historyPayload
    ).subscribe({
      next: (resp) => {
        this.loading = false;
        this.chatHistory.push({
          role: 'model',
          text: resp,
          formattedText: this.parseMarkdown(resp)
        });
        this.scrollToBottom();
      },
      error: () => {
        this.loading = false;
        this.chatHistory.push({
          role: 'model',
          text: "I encountered an error replying to your question. Please try again.",
          formattedText: "I encountered an error replying to your question. Please try again."
        });
      }
    });
  }

  private scrollToBottom(): void {
    try {
      this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  private parseMarkdown(text: string): string {
    if (!text) return '';
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Replace bold text (e.g. **text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Replace header formats (e.g. ### Headers)
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // Replace list bullets (e.g. - list item)
    html = html.replace(/^\s*-\s+(.*?)$/gm, '<li>$1</li>');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Replace newlines with breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }
}
