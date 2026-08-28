import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-crop-guide',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './crop-guide.component.html',
  styleUrl: './crop-guide.component.css'
})
export class CropGuideComponent {
}
