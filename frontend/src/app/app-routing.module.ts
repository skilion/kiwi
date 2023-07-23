import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { MessageFeedComponent } from './message-feed/message-feed.component';
import { NewMessageComponent } from './new-message/new-message.component';

const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'message-feed', component: MessageFeedComponent },
  { path: 'new-message', component: NewMessageComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule { }
