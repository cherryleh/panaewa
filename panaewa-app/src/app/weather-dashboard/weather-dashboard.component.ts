import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import * as Highcharts from 'highcharts';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
type MonthlyRainfallStats = { rainfall_in: number; normal_in: number; anomaly_in: number; anomaly_pct: number | null };
const SPI3_LABELS = ['D4', 'D3', 'D2', 'D1', 'D0', 'Near Normal', 'W0', 'W1', 'W2', 'W3', 'W4'] as const;
type Spi3Label = typeof SPI3_LABELS[number];
type Spi3MonthPct = Record<Spi3Label, number | null>;

@Component({
  selector: 'app-weather-dashboard',
  standalone: true,
  imports: [CommonModule, HighchartsChartModule],
  templateUrl: './weather-dashboard.component.html',
  styleUrls: ['./weather-dashboard.component.css']
})
  export class WeatherDashboardComponent implements OnInit {
  isBrowser: boolean;

  constructor(
    private http: HttpClient,
    private windService: WindService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }
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

  monthlyStats = new Map<string, MonthlyRainfallStats>();
  selectedMonthStats: MonthlyRainfallStats | null = null;

  // SPI-3 drought/wetness category history for Panaewa (diverging stacked area chart)
  spi3Loading = true;
  spi3Error = '';
  spi3UpdateFlag = false;
  readonly spi3WindowYears = 3;
  spi3Months: string[] = [];
  spi3Years: number[] = [];
  spi3WindowStartIndex = 0;
  spi3SeriesData: Record<Spi3Label, (number | null)[]> = SPI3_LABELS.reduce((acc, l) => {
    acc[l] = [];
    return acc;
  }, {} as Record<Spi3Label, (number | null)[]>);
  spi3ChartOptions: Highcharts.Options = {
    chart: { type: 'area' },
    title: { text: 'SPI-3 Drought & Wetness History' },
    xAxis: { categories: [], title: { text: 'Month' }, tickInterval: 12 },
    yAxis: {
      title: { text: '% of Panaʻewa area' },
      min: -100,
      max: 100,
      // Stacked area charts can otherwise let Highcharts auto-widen the computed
      // extremes beyond the explicit min/max - force the exact ticks we want.
      tickPositions: [-100, -50, 0, 50, 100],
      startOnTick: false,
      endOnTick: false,
      labels: { formatter: function (): string { return Math.abs(Number(this.value)) + '%'; } }
    },
    tooltip: {
      shared: true,
      valueDecimals: 1,
      formatter: function (): string {
        const points = (this as any).points ?? [];
        const label = points[0]?.point?.category ?? (this as any).x;
        const header = `<b>${label}</b><br/>`;
        return header + points
          .filter((p: any) => p.y !== 0)
          .map((p: any) => `${p.series.name}: ${Math.abs(p.y).toFixed(1)}%`)
          .join('<br/>');
      }
    },
    plotOptions: {
      area: { stacking: 'normal', marker: { enabled: false }, lineWidth: 0.5, fillOpacity: 1 }
    },
    series: [
      // Dry stack: listed innermost (closest to zero) to outermost (most extreme), since
      // Highcharts stacks negative values outward from zero in series order.
      { name: 'D0 (Abnormally Dry)', type: 'area', stack: 'dry', data: [], color: '#FFFF00' },
      { name: 'D1 (Moderate Drought)', type: 'area', stack: 'dry', data: [], color: '#FFD37F' },
      { name: 'D2 (Severe Drought)', type: 'area', stack: 'dry', data: [], color: '#FF9900' },
      { name: 'D3 (Extreme Drought)', type: 'area', stack: 'dry', data: [], color: '#FF0000' },
      { name: 'D4 (Exceptional Drought)', type: 'area', stack: 'dry', data: [], color: '#730000' },
      // Wet stack: innermost to outermost, same idea for positive values.
      { name: 'W0 (Abnormally Wet)', type: 'area', stack: 'wet', data: [], color: '#99CCFF' },
      { name: 'W1 (Moderately Wet)', type: 'area', stack: 'wet', data: [], color: '#4D94DB' },
      { name: 'W2 (Severely Wet)', type: 'area', stack: 'wet', data: [], color: '#0066CC' },
      { name: 'W3 (Extremely Wet)', type: 'area', stack: 'wet', data: [], color: '#003366' },
      { name: 'W4 (Exceptionally Wet)', type: 'area', stack: 'wet', data: [], color: '#001933' }
    ]
  };

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
          // console.log('Temp Diff:', this.monthlyTempDiff);
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

    // 5. Load monthly totals + climatological anomaly (shown alongside the slider above)
    this.http.get('https://raw.githubusercontent.com/cherryleh/panaewa/refs/heads/main/panaewa-app/public/rainfall_monthly_1990_present.csv', { responseType: 'text' })
      .subscribe({
        next: (csv) => {
          const lines = csv.trim().split('\n');
          lines.shift(); // drop header row

          for (const line of lines) {
            const [yearMonth, rainfall_in, normal_in, anomaly_in, anomaly_pct] = line.split(',');
            this.monthlyStats.set(yearMonth, {
              rainfall_in: Number(rainfall_in),
              normal_in: Number(normal_in),
              anomaly_in: Number(anomaly_in),
              anomaly_pct: anomaly_pct === '' ? null : Number(anomaly_pct)
            });
          }

          if (this.monthOptions.length > 0) {
            this.plotMonth();
          }
        },
        error: (err) => console.error('Failed to load monthly rainfall stats', err)
      });

    // 6. Load SPI-3 drought/wetness category history for Panaewa
    this.http.get('https://raw.githubusercontent.com/cherryleh/panaewa/refs/heads/main/panaewa-app/public/spi3_distribution_panaewa.csv', { responseType: 'text' })
      .subscribe({
        next: (csv) => this.plotSpi3(csv),
        error: (err) => {
          console.error('Failed to load SPI-3 history', err);
          this.spi3Error = 'Could not load drought/wetness history.';
          this.spi3Loading = false;
        }
      });
  }

  private plotSpi3(csv: string): void {
    const lines = csv.trim().split('\n');
    const header = lines.shift();
    if (!header) {
      this.spi3Error = 'No drought/wetness history data found.';
      this.spi3Loading = false;
      return;
    }
    const columns = header.split(',').slice(1) as Spi3Label[];

    const months: string[] = [];
    const seriesData: Record<Spi3Label, (number | null)[]> = SPI3_LABELS.reduce((acc, l) => {
      acc[l] = [];
      return acc;
    }, {} as Record<Spi3Label, (number | null)[]>);

    for (const line of lines) {
      const parts = line.split(',');
      const month = parts[0];
      months.push(month);

      const row: Partial<Spi3MonthPct> = {};
      columns.forEach((label, i) => {
        const raw = parts[i + 1];
        row[label] = raw === '' || raw === undefined ? null : Number(raw);
      });

      for (const label of SPI3_LABELS) {
        const v = row[label] ?? null;
        seriesData[label].push(v);
      }
    }

    this.spi3Months = months;
    this.spi3SeriesData = seriesData;
    this.spi3Years = [...new Set(months.map(m => Number(m.split('-')[0])))].sort((a, b) => a - b);
    this.spi3WindowStartIndex = Math.max(0, this.spi3Years.length - this.spi3WindowYears);

    this.updateSpi3Chart();
    this.spi3Loading = false;
  }

  get spi3WindowLabel(): string {
    if (this.spi3Years.length === 0) return '';
    const startYear = this.spi3Years[this.spi3WindowStartIndex];
    const endYear = this.spi3Years[Math.min(this.spi3WindowStartIndex + this.spi3WindowYears - 1, this.spi3Years.length - 1)];
    return startYear === endYear ? `${startYear}` : `${startYear} – ${endYear}`;
  }

  onSpi3WindowChange(value: number): void {
    this.spi3WindowStartIndex = value;
    this.updateSpi3Chart();
  }

  spi3PrevWindow(): void {
    if (this.spi3WindowStartIndex > 0) {
      this.spi3WindowStartIndex--;
      this.updateSpi3Chart();
    }
  }

  spi3NextWindow(): void {
    if (this.spi3WindowStartIndex < this.spi3Years.length - this.spi3WindowYears) {
      this.spi3WindowStartIndex++;
      this.updateSpi3Chart();
    }
  }

  private updateSpi3Chart(): void {
    if (this.spi3Years.length === 0) return;

    const startYear = this.spi3Years[this.spi3WindowStartIndex];
    const endYear = this.spi3Years[Math.min(this.spi3WindowStartIndex + this.spi3WindowYears - 1, this.spi3Years.length - 1)];

    const indices = this.spi3Months
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => {
        const y = Number(m.split('-')[0]);
        return y >= startYear && y <= endYear;
      })
      .map(({ i }) => i);

    const categories = indices.map(i => {
      const [y, m] = this.spi3Months[i].split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });

    const slice = (arr: (number | null)[]) => indices.map(i => arr[i]);
    const negate = (arr: (number | null)[]) => arr.map(v => v === null ? null : -v);

    this.spi3ChartOptions = {
      ...this.spi3ChartOptions,
      xAxis: { ...(this.spi3ChartOptions.xAxis as Highcharts.XAxisOptions), categories },
      series: [
        { ...(this.spi3ChartOptions.series?.[0] as Highcharts.SeriesAreaOptions), data: negate(slice(this.spi3SeriesData['D0'])) },
        { ...(this.spi3ChartOptions.series?.[1] as Highcharts.SeriesAreaOptions), data: negate(slice(this.spi3SeriesData['D1'])) },
        { ...(this.spi3ChartOptions.series?.[2] as Highcharts.SeriesAreaOptions), data: negate(slice(this.spi3SeriesData['D2'])) },
        { ...(this.spi3ChartOptions.series?.[3] as Highcharts.SeriesAreaOptions), data: negate(slice(this.spi3SeriesData['D3'])) },
        { ...(this.spi3ChartOptions.series?.[4] as Highcharts.SeriesAreaOptions), data: negate(slice(this.spi3SeriesData['D4'])) },
        { ...(this.spi3ChartOptions.series?.[5] as Highcharts.SeriesAreaOptions), data: slice(this.spi3SeriesData['W0']) },
        { ...(this.spi3ChartOptions.series?.[6] as Highcharts.SeriesAreaOptions), data: slice(this.spi3SeriesData['W1']) },
        { ...(this.spi3ChartOptions.series?.[7] as Highcharts.SeriesAreaOptions), data: slice(this.spi3SeriesData['W2']) },
        { ...(this.spi3ChartOptions.series?.[8] as Highcharts.SeriesAreaOptions), data: slice(this.spi3SeriesData['W3']) },
        { ...(this.spi3ChartOptions.series?.[9] as Highcharts.SeriesAreaOptions), data: slice(this.spi3SeriesData['W4']) }
      ]
    };
    this.spi3UpdateFlag = true;
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

    this.selectedMonthStats = this.monthlyStats.get(prefix) ?? null;

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
