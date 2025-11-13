import { Component, OnInit } from '@angular/core';
import * as Highcharts from 'highcharts';
import { CommonModule } from '@angular/common';
import { HighchartsChartModule } from 'highcharts-angular';
import { HttpClient } from '@angular/common/http';

type RFTempPoint = { date: string; rf_sum: number; temp_mean: number; };
type WeatherVars = {
  YestYr: number;
  YestMonth: number;
  YestDay: number;
  LastMonth: number;
  LastMonthYr: number;
  relative_humidity: number;
  tmean_daily: number;
  tmean_monthly: number;
  tmean_diff: number;
  rf_daily: number;
  rf_monthly: number;
  rf_pdiff: number;
  wind_speed: number;
  wind_direction: string;
  drought: string;
};

@Component({
  selector: 'app-weather-dashboard',
  standalone: true,
  imports: [CommonModule, HighchartsChartModule],
  templateUrl: './weather-dashboard.component.html',
  styleUrls: ['./weather-dashboard.component.css']
})
  export class WeatherDashboardComponent implements OnInit {
  constructor(private http: HttpClient) {}
  yesterdayData = { humidity: 0, tmean: 0, rainfall: 0 };
  yesterday = '';
  lastMonth = '';
  lastHourWind = { speed: 10, direction: '' }; // Placeholder (no data in JSON)
  lastMonthSummary = { tmean: 0, rainfall: 0, drought: '' }; // Drought placeholder
  vogLevel = 'Good'; // Placeholder until JSON has value
  dailyRainfallChange = '';
  monthlyRainfallChange = '';
  dailyTempDiff = '';
  monthlyTempDiff = '';


  

Highcharts: typeof Highcharts = Highcharts;
  updateFlag = false; // tells highcharts-angular to re-render

  rainfallChartOptions: Highcharts.Options = {
    title: { text: 'Last 7 Days Rainfall & Temperature' },
    xAxis: { categories: [], title: { text: 'Date' } },
    yAxis: [
      { // 0: Temperature
        title: { text: 'Temperature (°F)' },
        opposite: false
      },
      { // 1: Rainfall
        title: { text: 'Rainfall (in)' },
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
    // 1. Load rf_temp_timeseries.json
    this.http.get<RFTempPoint[]>('rf_temp_timeseries.json').subscribe({
      next: (rows) => {
        const data = [...rows].sort((a, b) => a.date.localeCompare(b.date));
        const categories = data.map(d => {
          const [y, m, day] = d.date.split('-').map(Number);
          return new Date(y, m - 1, day).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
        });

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
      error: (err) => console.error('Failed to load rf_temp_timeseries.json', err)
    });

      this.http.get<WeatherVars>('weather_vars.json').subscribe({
        next: (vars) => {
        // Format yesterday
        this.yesterday = new Date(vars.YestYr, vars.YestMonth - 1, vars.YestDay)
          .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        // Format last month
        this.lastMonth = new Date(vars.LastMonthYr, vars.LastMonth - 1, 1)
          .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Yesterday's data
        this.yesterdayData = {
          humidity: vars.relative_humidity,
          tmean: vars.tmean_daily,
          rainfall: vars.rf_daily
        };

        this.lastMonthSummary = {
          tmean: vars.tmean_monthly,
          rainfall: vars.rf_monthly,
          drought: vars.drought
        };

        // Temperature difference (with sign)
        if (vars.tmean_diff !== undefined) {
          const diff = vars.tmean_diff;
          this.monthlyTempDiff = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} °F`;
          console.log('Temp Diff:', this.monthlyTempDiff);
        } else {
          this.monthlyTempDiff = 'N/A';
        }

        // Rainfall percent difference (with sign)
        if (vars.rf_pdiff !== undefined) {
          const pdiff = vars.rf_pdiff;
          this.monthlyRainfallChange = `${pdiff > 0 ? '+' : ''}${pdiff.toFixed(0)}%`;
        } else {
          this.monthlyRainfallChange = 'N/A';
        }
      },
      error: (err) => console.error('Failed to load weather_vars.json', err)
    });


  }
}