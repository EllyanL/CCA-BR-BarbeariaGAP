import { Component } from '@angular/core';
import { TitleService } from './services/title.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styles: ['']
})
export class AppComponent {
  constructor(private titleService: TitleService) { }
}
