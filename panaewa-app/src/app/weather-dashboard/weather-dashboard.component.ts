import { Component, OnInit } from '@angular/core';
import * as Highcharts from 'highcharts';
import { CommonModule } from '@angular/common';
import { HighchartsChartModule } from 'highcharts-angular';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type RFTempPoint = { date: string; rf_sum: number; temp_mean: number; };

@Component({
  selector: 'app-weather-dashboard',
  standalone: true,
  imports: [CommonModule, HighchartsChartModule, HttpClientModule],
  templateUrl: './weather-dashboard.component.html',
  styleUrls: ['./weather-dashboard.component.css']
})
  export class WeatherDashboardComponent implements OnInit {
  constructor(private http: HttpClient) {}
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
  updateFlag = false; // tells highcharts-angular to re-render

  rainfallChartOptions: Highcharts.Options = {
    title: { text: 'Last 7 Days Rainfall & Temperature' },
    xAxis: { categories: [], title: { text: 'Date' } },
    yAxis: [
      { // 0: Temperature
        title: { text: 'Temperature (°C)' },
        opposite: false
      },
      { // 1: Rainfall
        title: { text: 'Rainfall (mm)' },
        opposite: true
      }
    ],
    tooltip: {
      shared: true,
      valueDecimals: 2
    },
    series: [
      {
        name: 'Temperature',
        type: 'line',
        yAxis: 0,
        data: [],
        zIndex: 10,
        marker: { enabled: true, radius: 4 },
        color: '#f28e2c',
      },
      {
        name: 'Rainfall',
        type: 'column',
        yAxis: 1,
        data: [],
        borderWidth: 0,
        color: '#007bff',
      }
    ]
  };

  ngOnInit(): void {
    // If the file is under /public, use the leading slash:
    //   /public/rf_temp_timeseries.json  -> URL is '/rf_temp_timeseries.json'
    // If it's under src/assets, use 'assets/rf_temp_timeseries.json'
    const url = '/rf_temp_timeseries.json';

    this.http.get<RFTempPoint[]>(url).subscribe({
      next: (rows) => {
        // Optional: sort by date just in case
        const data = [...rows].sort((a, b) => a.date.localeCompare(b.date));

        const categories = data.map(d =>
          new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        );
        const temps = data.map(d => Number(d.temp_mean));
        const rain = data.map(d => Number(d.rf_sum));

        this.rainfallChartOptions = {
          ...this.rainfallChartOptions,
          xAxis: { ...(this.rainfallChartOptions.xAxis as Highcharts.XAxisOptions), categories },
          series: [
            { ...(this.rainfallChartOptions.series?.[0] as Highcharts.SeriesLineOptions), data: temps },
            { ...(this.rainfallChartOptions.series?.[1] as Highcharts.SeriesColumnOptions), data: rain }
          ]
        };

        this.updateFlag = true;
      },
      error: (err) => {
        console.error('Failed to load rf_temp_timeseries.json', err);
      }
    });
  }
}


