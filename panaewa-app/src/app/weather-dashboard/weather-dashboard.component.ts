import { Component } from '@angular/core';
import * as Highcharts from 'highcharts';
import { CommonModule } from '@angular/common';
import { HighchartsChartModule } from 'highcharts-angular';

@Component({
  selector: 'app-weather-dashboard',
  standalone: true,
  imports: [CommonModule, HighchartsChartModule],
  templateUrl: './weather-dashboard.component.html',
  styleUrls: ['./weather-dashboard.component.css']
})
export class WeatherDashboardComponent {
  yesterdayData = {
    humidity: 78,
    tmean: 24.3,
    rainfall: 12.5
  };

  yesterday = 'June 3, 2025';
  lastMonth = 'May 2025';

  lastHourWind = {
    speed: 10.2,
    direction: 'NE'
  };

  lastMonthSummary = {
    tmean: 25.1,
    rainfall: 88.3,
    drought: 'Moderate Drought'
  };

  vogLevel = 'Good';

  // Static comparison values
  dailyRainfallChange = '+8.5%';
  monthlyRainfallChange = '-7.2%';

  dailyTempDiff = '+0.5°C';
  monthlyTempDiff = '+0.3°C';

  Highcharts: typeof Highcharts = Highcharts;
  rainfallChartOptions: Highcharts.Options = {
    title: { text: 'Last 7 Days Rainfall & Temperature' },
    xAxis: {
      categories: [
        'May 28, 2025',
        'May 29, 2025',
        'May 30, 2025',
        'May 31, 2025',
        'June 1, 2025',
        'June 2, 2025',
        'June 3, 2025'
      ],
      title: { text: 'Date' }
    },
    yAxis: [{
      title: { text: 'Temperature (°C)' },
      opposite: false
    }, {
      title: { text: 'Rainfall (mm)' },
      opposite: true
    }],
    series: [{
      name: 'Temperature',
      type: 'line',
      yAxis: 0,
      data: [24, 25, 26, 25, 24.5, 23.8, 24.2],
      color: '#f28e2c',
      zIndex: 10,
      marker: {
        enabled: true,
        radius: 4
      }
    }, {
      name: 'Rainfall',
      type: 'column',
      yAxis: 1,
      data: [5, 0, 12, 3, 7, 15, 6],
      color: '#007bff',
      borderWidth: 0
    }]
  };
}


