import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeStore } from '../core/stores/theme-store';
import { KkhToastHostComponent } from '../shared/ui/kkh-toast-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, KkhToastHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ng-admin-panel');
  /** Eager init so html.dark syncs before feature routes load. */
  private readonly themeStore = inject(ThemeStore);
}
