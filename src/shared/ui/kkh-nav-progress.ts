import {
  Component,
  DestroyRef,
  inject,
  signal,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router
} from '@angular/router';
import { filter } from 'rxjs';

/**
 * Thin top-edge progress indicator for route navigations (lazy loads + guards).
 */
@Component({
  selector: 'kkh-nav-progress',
  standalone: true,
  host: {
    class: 'kkh-nav-progress-host',
    '[class.kkh-nav-progress-host--active]': 'visible()',
    '[attr.aria-hidden]': 'true'
  },
  template: `
    <div
      class="kkh-nav-progress"
      [class.kkh-nav-progress--visible]="visible()"
      [class.kkh-nav-progress--finishing]="finishing()"
    >
      <div class="kkh-nav-progress__bar" [style.width.%]="progress()">
        <div class="kkh-nav-progress__glow"></div>
      </div>
    </div>
  `
})
export class KkhNavProgressComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly visible = signal(false);
  protected readonly finishing = signal(false);
  protected readonly progress = signal(0);

  private trickleTimer: ReturnType<typeof setInterval> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private navDepth = 0;

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter(
          (e) =>
            e instanceof NavigationStart ||
            e instanceof NavigationEnd ||
            e instanceof NavigationCancel ||
            e instanceof NavigationError
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.onStart();
          return;
        }
        this.onFinish();
      });

    this.destroyRef.onDestroy(() => {
      this.clearTimers();
    });
  }

  private onStart(): void {
    this.navDepth += 1;
    if (this.navDepth > 1) {
      return;
    }

    this.clearTimers();
    this.finishing.set(false);
    this.visible.set(true);
    this.progress.set(12);

    this.trickleTimer = setInterval(() => {
      const current = this.progress();
      if (current >= 88) {
        return;
      }
      // Ease toward ~90% while the route is resolving.
      const delta = Math.max(0.6, (90 - current) * 0.08);
      this.progress.set(Math.min(88, current + delta));
    }, 180);
  }

  private onFinish(): void {
    this.navDepth = Math.max(0, this.navDepth - 1);
    if (this.navDepth > 0) {
      return;
    }

    this.clearTrickle();
    this.progress.set(100);
    this.finishing.set(true);

    this.hideTimer = setTimeout(() => {
      this.visible.set(false);
      this.finishing.set(false);
      // Reset after fade so the next nav starts from 0 cleanly.
      this.hideTimer = setTimeout(() => {
        this.progress.set(0);
        this.hideTimer = null;
      }, 220);
    }, 180);
  }

  private clearTrickle(): void {
    if (this.trickleTimer != null) {
      clearInterval(this.trickleTimer);
      this.trickleTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearTrickle();
    if (this.hideTimer != null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
