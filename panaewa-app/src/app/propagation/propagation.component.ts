import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PROPAGATION_GUIDES, PropagationGuide } from './propagation.data';

@Component({
  selector: 'app-propagation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './propagation.component.html',
  styleUrl: './propagation.component.css'
})
export class PropagationComponent {
  guides = PROPAGATION_GUIDES;
  selected: PropagationGuide = this.guides[0];

  select(guide: PropagationGuide): void {
    this.selected = guide;
  }

  imgSrc(file: string): string {
    return `/img/propagation/${file}`;
  }
}
