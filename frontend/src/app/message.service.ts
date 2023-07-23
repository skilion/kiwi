import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'
import { Observable, firstValueFrom, lastValueFrom } from 'rxjs';

import { environment } from 'src/environments/environment';
import { Message } from './message';
import { NewMessage } from './new-message';

@Injectable({
  providedIn: 'root'
})
export class MessageService {

  constructor(private http: HttpClient) { }

  async getFeed(lastMessageTime?: number): Promise<Message[]> {
    let url = environment.backendApiUrl + 'feed';
    if (lastMessageTime) {
      url += `?LastMessageTime=${lastMessageTime}`;
    }
    let response = this.http.get(url) as Observable<Message[]>;
    return firstValueFrom(response);
  }

  async postMessage(message: NewMessage) {
    let url = environment.backendApiUrl + 'messages';
    return lastValueFrom(this.http.post(url, message));
  }

}
