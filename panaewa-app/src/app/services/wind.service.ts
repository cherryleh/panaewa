import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

const IPIF_STATION_ID = '0281';
const COMPASS_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function degToCompass(deg: number): string {
  const ix = Math.round(deg / 45) % 8;
  return COMPASS_DIRS[ix];
}

type MesonetMeasurement = {
  timestamp: string;
  station_id: string;
  variable: string;
  value: string | null;
  flag: number;
};

export type WindReading = { speed: number; direction: string; timestamp: string };

@Injectable({
  providedIn: 'root'
})
export class WindService {
  private baseUrl = 'https://api.hcdp.ikewai.org/mesonet/db/measurements';

  constructor(private http: HttpClient) {}

  getLatestWind(): Observable<WindReading> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${environment.apiToken}`);
    const params = {
      location: 'hawaii',
      station_ids: IPIF_STATION_ID,
      var_ids: 'WS_1_Avg,WDrs_1_Avg',
      limit: '2',
      local_tz: 'true'
    };

    return this.http.get<MesonetMeasurement[]>(this.baseUrl, { headers, params }).pipe(
      map((rows) => {
        const speedRow = rows.find(r => r.variable === 'WS_1_Avg' && r.value !== null);
        const dirRow = rows.find(r => r.variable === 'WDrs_1_Avg' && r.value !== null);

        const speedMs = speedRow ? Number(speedRow.value) : 0;
        const directionDeg = dirRow ? Number(dirRow.value) : 0;

        return {
          speed: Math.round(speedMs * 2.23694),
          direction: speedMs > 0.01 ? degToCompass(directionDeg) : 'Calm',
          timestamp: speedRow?.timestamp ?? dirRow?.timestamp ?? ''
        };
      })
    );
  }
}
