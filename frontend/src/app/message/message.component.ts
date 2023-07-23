import { Component, Input } from '@angular/core';
import { Message } from '../message';

@Component({
  selector: 'app-message',
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.css']
})
export class MessageComponent {
  @Input() message?: Message;

  get avatarUrl(): string {
    let id = 0;
    if (this.message !== undefined && this.message.Author !== 'Anonymous') {
      id = this.message.MessageId % 99 + 1;
    }
    return `assets/avatars/${id}.svg`;
  }
}
