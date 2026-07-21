import { Component } from '@angular/core';
import { SYSTEM_DEFAULT_LABEL } from '../../core/auth/system-defaults.util';

@Component({
  selector: 'kkh-system-default-badge',
  template: `
    <span
      class="kkh-chip kkh-chip-system"
      [title]="hint"
    >{{ label }}</span>
  `
})
export class KkhSystemDefaultBadgeComponent {
  protected readonly label = SYSTEM_DEFAULT_LABEL;
  protected readonly hint = 'Built-in IAM default — cannot be edited or deleted';
}
