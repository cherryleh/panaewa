import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { WeatherDashboardComponent } from './weather-dashboard/weather-dashboard.component';
import { ResourcesComponent } from './resources/resources.component';
import { MoonPhaseComponent } from './moon-phase/moon-phase.component';
import { PlantProfilesComponent } from './plant-profiles/plant-profiles.component';
import { PropagationComponent } from './propagation/propagation.component';
import { CropGuideComponent } from './crop-guide/crop-guide.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'weather-dashboard', component: WeatherDashboardComponent },
    { path: 'resources', component: ResourcesComponent },
    { path: 'moon-phase', component: MoonPhaseComponent },
    { path: 'plant-profiles', component: PlantProfilesComponent },
    { path: 'propagation', component: PropagationComponent },
    { path: 'crop-guide', component: CropGuideComponent }
];
