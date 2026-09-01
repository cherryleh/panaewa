import { Component, OnInit } from '@angular/core';
import * as Highcharts from 'highcharts';
import { CommonModule } from '@angular/common';
import { HighchartsChartModule } from 'highcharts-angular';
import { HttpClient } from '@angular/common/http';
import { WindService } from '../services/wind.service';

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
  drought: string;
  air_quality: string
};
type RainfallHistoryPoint = { date: string; value: number | null };
type MonthOption = { year: number; month: number; label: string };

@Component({
  selector: 'app-weather-dashboard',
  standalone: true,
  imports: [CommonModule, HighchartsChartModule],
  templateUrl: './weather-dashboard.component.html',
  styleUrls: ['./weather-dashboard.component.css']
})
  export class WeatherDashboardComponent implements OnInit {
  constructor(private http: HttpClient, private windService: WindService) {}
  yesterdayData = { humidity: 0, tmean: 0, rainfall: 0, airQuality: '' };
  yesterday = '';
  lastMonth = '';
  lastHourWind = { speed: 0, direction: '' };
  windTimestamp = '';
  windLoading = true;
  lastMonthSummary = { tmean: 0, rainfall: 0, drought: '' }; // Drought placeholder
  vogLevel = 'Good'; // Placeholder until JSON has value
  dailyRainfallChange = '';
  monthlyRainfallChange = '';
  dailyTempDiff = '';
  monthlyTempDiff = '';

  // Rainfall history browser: full 1990-present dataset, one month shown at a time via slider
  rainfallHistory: RainfallHistoryPoint[] = [];
  monthOptions: MonthOption[] = [];
  monthIndex = 0;
  historyLoading = true;
  historyError = '';

  rangeUpdateFlag = false;
  rangeChartOptions: Highcharts.Options = {
    title: { text: 'Rainfall History' },
    xAxis: { categories: [], title: { text: 'Day' } },
    yAxis: { title: { text: 'Rainfall (in)' } },
    tooltip: { valueDecimals: 2 },
    series: [
      {
        name: 'Rainfall',
        type: 'column',
        data: [],
        borderWidth: 0,
        color: '#007bff'
      }
    ]
  };




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
    this.http.get<RFTempPoint[]>('https://raw.githubusercontent.com/cherryleh/panaewa/refs/heads/main/panaewa-app/public/rf_temp_timeseries.json').subscribe({
      next: (rows) => {
        const data = [...rows].sort((a, b) => a.date.localeCompare(b.date));
        const categories = data.map(d => {
          const [y, m, day] = d.date.split('-').map(Number);
          return new Date(y, m - 1, day).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
        });

        const temps = data.map(d =>
          d.temp_mean === null || d.temp_mean === undefined
            ? null
            : Number(d.temp_mean)
        );

        const rain = data.map(d =>
          d.rf_sum === null || d.rf_sum === undefined
            ? null
            : Number(d.rf_sum)
        );

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

      this.http.get<WeatherVars>('https://raw.githubusercontent.com/cherryleh/panaewa/refs/heads/main/panaewa-app/public/weather_vars.json').subscribe({
        next: (vars) => {
        this.yesterday = new Date(vars.YestYr, vars.YestMonth - 1, vars.YestDay)
          .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        this.lastMonth = new Date(vars.LastMonthYr, vars.LastMonth - 1, 1)
          .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });


        this.yesterdayData = {
          humidity: vars.relative_humidity,
          tmean: vars.tmean_daily,
          rainfall: vars.rf_daily,
          airQuality: vars.air_quality
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

    // 3. Load the latest wind reading directly from the HCDP mesonet API
    this.windService.getLatestWind().subscribe({
      next: (wind) => {
        this.lastHourWind = {
          speed: wind.speed,
          direction: wind.direction
        };
        this.windTimestamp = wind.timestamp
          ? new Date(wind.timestamp).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })
          : '';
        this.windLoading = false;
      },
      error: (err) => {
        console.error('Failed to load latest wind reading', err);
        this.windLoading = false;
      }
    });

    // 4. Load full rainfall history (browse one month at a time via the slider below)
    this.http.get('https://raw.githubusercontent.com/cherryleh/panaewa/refs/heads/main/panaewa-app/public/rainfall_daily_1990_present.csv', { responseType: 'text' })
      .subscribe({
        next: (csv) => {
          const lines = csv.trim().split('\n');
          lines.shift(); // drop header row

          this.rainfallHistory = lines.map(line => {
            const [date, value] = line.split(',');
            return { date, value: value === '' || value === undefined ? null : Number(value) };
          });

          if (this.rainfallHistory.length > 0) {
            const [firstY, firstM] = this.rainfallHistory[0].date.split('-').map(Number);
            const [lastY, lastM] = this.rainfallHistory[this.rainfallHistory.length - 1].date.split('-').map(Number);

            const months: MonthOption[] = [];
            let y = firstY, m = firstM;
            while (y < lastY || (y === lastY && m <= lastM)) {
              months.push({
                year: y,
                month: m,
                label: new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              });
              m++;
              if (m > 12) { m = 1; y++; }
            }

            this.monthOptions = months;
            this.monthIndex = months.length - 1; // default to most recent month
            this.plotMonth();
          } else {
            this.historyError = 'No rainfall history data found.';
          }
          this.historyLoading = false;
        },
        error: (err) => {
          console.error('Failed to load rainfall history', err);
          this.historyError = 'Could not load rainfall history.';
          this.historyLoading = false;
        }
      });
  }

  get selectedMonth(): MonthOption | null {
    return this.monthOptions[this.monthIndex] ?? null;
  }

  onMonthSliderChange(value: number): void {
    this.monthIndex = value;
    this.plotMonth();
  }

  prevMonth(): void {
    if (this.monthIndex > 0) {
      this.monthIndex--;
      this.plotMonth();
    }
  }

  nextMonth(): void {
    if (this.monthIndex < this.monthOptions.length - 1) {
      this.monthIndex++;
      this.plotMonth();
    }
  }

  plotMonth(): void {
    const selected = this.selectedMonth;
    if (!selected) return;

    const prefix = `${selected.year}-${String(selected.month).padStart(2, '0')}`;
    const points = this.rainfallHistory.filter(p => p.date.startsWith(prefix));

    const categories = points.map(p => p.date.split('-')[2]);
    const data = points.map(p => p.value);

    this.rangeChartOptions = {
      ...this.rangeChartOptions,
      title: { text: `Rainfall - ${selected.label}` },
      xAxis: { ...(this.rangeChartOptions.xAxis as Highcharts.XAxisOptions), categories },
      series: [
        { ...(this.rangeChartOptions.series?.[0] as Highcharts.SeriesColumnOptions), data }
      ]
    };
    this.rangeUpdateFlag = true;
  }
}
