import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PROPAGATION_GUIDES, PropagationGuide } from './propagation.data';

@Component({
  selector: 'app-propagation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './propagation.component.html',
  styleUrl: './propagation.component.css'
})
export class PropagationComponent {
  guides = PROPAGATION_GUIDES;
  selected: PropagationGuide = this.guides[0];
  lightboxSrc: string | null = null;
  lightboxAlt = '';

  select(guide: PropagationGuide): void {
    this.selected = guide;
  }

  imgSrc(file: string): string {
    return `img/propagation/${file}`;
  }

  openLightbox(src: string, alt: string): void {
    this.lightboxSrc = src;
    this.lightboxAlt = alt;
  }

  closeLightbox(): void {
    this.lightboxSrc = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeLightbox();
  }
}
