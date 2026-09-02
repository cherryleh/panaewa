import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'panaewa-app';

  constructor(private router: Router, @Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId) || window.parent === window) {
      return;
    }

    // Tell the embedding page which route is active so it can keep its own
    // URL in sync with navigation that happens inside this iframe.
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        window.parent.postMessage(
          { source: 'panaewa-app', type: 'navigation', path: event.urlAfterRedirects },
          '*'
        );
      });
    window.parent.postMessage(
      { source: 'panaewa-app', type: 'navigation', path: this.router.url },
      '*'
    );

    // Allow the embedding page to request a specific route, e.g. when the
    // visitor uses the browser's back/forward buttons.
    window.addEventListener('message', (event: MessageEvent) => {
      const data = event.data;
      if (data && data.source === 'panaewa-wrapper' && data.type === 'navigate' && typeof data.path === 'string') {
        this.router.navigateByUrl(data.path);
      }
    });
  }
}
