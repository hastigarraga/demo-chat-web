import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding:16px;color:#fff">
      OK Angular ✅
      <div style="margin-top:8px;font-size:12px;opacity:.8">Si ves esto, montó.</div>
    </div>
  `,
})
export class AppComponent {}
