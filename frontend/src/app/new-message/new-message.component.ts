import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { MessageService } from '../message.service';
import { NewMessage } from '../new-message';

@Component({
  selector: 'app-new-message',
  templateUrl: './new-message.component.html',
  styleUrls: ['./new-message.component.css']
})
export class NewMessageComponent {

  constructor(private messageService: MessageService) { }

  messageForm = new FormGroup({
    author: new FormControl({ value: 'Anonymous', disabled: true, }, { nonNullable: true }),
    message: new FormControl('', Validators.required),
  });

  submit() {
    if (!this.messageForm.invalid) {
      let newMessage: NewMessage = {
        Author: this.messageForm.get('author')?.value ?? '',
        Text: this.messageForm.get('message')?.value ?? '',
      }
      this.messageService.postMessage(newMessage);
      this.messageForm.reset();
      this.messageForm.get('message')?.setErrors(null);
      this.messageForm.markAsPristine();
      this.messageForm.markAsUntouched();
      this.messageForm.updateValueAndValidity();
    }
  }
}
