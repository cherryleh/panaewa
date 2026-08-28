import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PLANT_PROFILES, PlantProfile } from './plant-profiles.data';

@Component({
  selector: 'app-plant-profiles',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './plant-profiles.component.html',
  styleUrl: './plant-profiles.component.css'
})
export class PlantProfilesComponent {
  plants = PLANT_PROFILES;
  selected: PlantProfile = this.plants[0];

  constructor(private sanitizer: DomSanitizer) {}

  select(plant: PlantProfile): void {
    this.selected = plant;
  }

  isListItem(paragraph: string): boolean {
    return paragraph.trim().startsWith('-');
  }

  format(text: string): SafeHtml {
    let html = text;
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    html = html.replace(
      /<(https?:[^>\s]+)>/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/^-\s*/, '');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
