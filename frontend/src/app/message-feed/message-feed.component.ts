import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, Subscription, timer } from 'rxjs';

import { MessageService } from '../message.service';
import { Message } from '../message';

@Component({
  selector: 'app-message-feed',
  templateUrl: './message-feed.component.html',
  styleUrls: ['./message-feed.component.css']
})
export class MessageFeedComponent implements OnInit {
  private _feed: Message[] = [];

  liveUpdate = new FormControl(true);

  constructor(private messageService: MessageService) { }

  get feed() {
    return this._feed;
  }

  async ngOnInit() {
    timer(0, 5000).subscribe(() => this.update());
  }

  async loadMore() {
    let more: Message[] = [];

    if (this._feed.length > 0) {
      let lastMessageCreatedAt = this._feed[this._feed.length - 1].CreatedAt;
      more = await this.messageService.getFeed(lastMessageCreatedAt);
    } else {
      more = await this.messageService.getFeed();
    }

    this._feed.push(...more)
  }

  async update() {
    const firstMessageId = this._feed[0]?.MessageId ?? 0;
    const newFeed = await this.messageService.getFeed();
    let newMessages: Message[] = [];

    for (const message of newFeed) {
      if (message.MessageId == firstMessageId) {
        break;
      }
      newMessages.push(message);
    }

    this._feed.unshift(...newMessages);
  }
}
