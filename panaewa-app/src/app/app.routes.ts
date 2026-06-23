import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { WeatherDashboardComponent } from './weather-dashboard/weather-dashboard.component';
import { ResourcesComponent } from './resources/resources.component';
import { MoonPhaseComponent } from './moon-phase/moon-phase.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'weather-dashboard', component: WeatherDashboardComponent },
    { path: 'resources', component: ResourcesComponent },
    { path: 'moon-phase', component: MoonPhaseComponent }
];
