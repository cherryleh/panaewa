import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { WeatherDashboardComponent } from './weather-dashboard/weather-dashboard.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'weather-dashboard', component: WeatherDashboardComponent },
];
