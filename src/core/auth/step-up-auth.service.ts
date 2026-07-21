import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface AuthenticationRequiredPayload {
  requirement_key?: string;
  process_key?: string;
  route_pattern?: string;
  http_method?: string;
  mode?: string;
  required_methods?: string[];
  initiate_session_url?: string;
  verify_url?: string;
}

export type StepUpPhase = 'idle' | 'choose' | 'code' | 'verifying' | 'done' | 'cancelled';

@Injectable({ providedIn: 'root' })
export class StepUpAuthService {
  private readonly http = inject(HttpClient);

  readonly open = signal(false);
  readonly phase = signal<StepUpPhase>('idle');
  readonly payload = signal<AuthenticationRequiredPayload | null>(null);
  readonly selectedMethod = signal<string>('');
  readonly destination = signal('');
  readonly code = signal('');
  readonly challengeToken = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  private resolver: ((ok: boolean) => void) | null = null;
  private active = false;

  /** Returns true when step-up completed successfully. */
  requestChallenge(payload: AuthenticationRequiredPayload): Promise<boolean> {
    if (this.active) {
      return Promise.resolve(false);
    }

    this.active = true;
    this.payload.set(payload);
    this.error.set(null);
    this.code.set('');
    this.challengeToken.set(null);
    this.destination.set('');

    const methods = (payload.required_methods ?? []).map((m) => m.toLowerCase());
    this.selectedMethod.set(methods[0] ?? 'email');
    this.open.set(true);

    if (methods.length === 1 && methods[0] === 'totp') {
      this.phase.set('code');
      void this.sendCode();
    } else {
      this.phase.set('choose');
    }

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  cancel(): void {
    this.finish(false);
  }

  async sendCode(): Promise<void> {
    const payload = this.payload();
    const method = this.selectedMethod();
    if (!payload || !method) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.http.post<{ challenge_token: string; method: string }>(
          payload.initiate_session_url || '/authentication/challenges/initiate-session',
          {
            requirement_key: payload.requirement_key || payload.process_key,
            process_key: payload.process_key || payload.requirement_key,
            method,
            destination: this.destination().trim() || null
          }
        )
      );
      this.challengeToken.set(response.challenge_token);
      this.phase.set('code');
    } catch (err: unknown) {
      this.error.set(this.apiError(err, 'Failed to start verification.'));
      if (method === 'totp') {
        this.phase.set('choose');
      }
    } finally {
      this.busy.set(false);
    }
  }

  async verifyCode(): Promise<void> {
    const token = this.challengeToken();
    const payload = this.payload();
    if (!token || !payload) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    this.phase.set('verifying');
    try {
      await firstValueFrom(
        this.http.post(payload.verify_url || '/authentication/challenges/verify', {
          challenge_token: token,
          code: this.code().trim()
        })
      );
      this.phase.set('done');
      this.finish(true);
    } catch (err: unknown) {
      this.phase.set('code');
      this.error.set(this.apiError(err, 'Invalid verification code.'));
    } finally {
      this.busy.set(false);
    }
  }

  private finish(ok: boolean): void {
    this.open.set(false);
    this.phase.set(ok ? 'done' : 'cancelled');
    this.active = false;
    const resolve = this.resolver;
    this.resolver = null;
    resolve?.(ok);
  }

  private apiError(err: unknown, fallback: string): string {
    const error = err as { error?: { detail?: string; title?: string; message?: string } };
    return error?.error?.detail || error?.error?.title || error?.error?.message || fallback;
  }
}
