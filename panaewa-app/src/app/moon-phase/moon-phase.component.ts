import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as SunCalc from 'suncalc';

const MOON_COLOR = '#f5f3ce';
const DARK_COLOR = '#1a1a2e';

const PHASES = [
  { name: 'Hilo',           phase: 'Waxing', illumination: '1–3%',   actions: ['Lunation begins', "Plant anything but maiʻa"] },
  { name: 'Hoaka',          phase: 'Waxing', illumination: '3–7%',   actions: ["Plant ʻuala, tubers"] },
  { name: 'Kū Kahi',        phase: 'Waxing', illumination: '7–13%',  actions: ["Plant ʻuala, upright (Kū) plants", "One firm, upright shoot will be produced"] },
  { name: 'Kū Lua',         phase: 'Waxing', illumination: '13–21%', actions: ["Plant ʻuala, kalo, maiʻa, trees", "Two firm, upright shoots will be produced"] },
  { name: 'Kū Kolu',        phase: 'Waxing', illumination: '21–30%', actions: ["Three firm, upright shoots will be produced"] },
  { name: 'Kū Pau',         phase: 'Waxing', illumination: '30–40%', actions: ["Plant ʻuala and kalo for firm, upright growth"] },
  { name: "'Ole Kū Kahi",   phase: 'Waxing', illumination: '40–49%', actions: ["Unproductive planting day", "Cultivate, prune"] },
  { name: "'Ole Kū Lua",    phase: 'Waxing', illumination: '49–58%', actions: ["Unproductive planting day", "Prune and mulch"] },
  { name: "'Ole Kū Kolu",   phase: 'Waxing', illumination: '58–69%', actions: ["Unproductive planting day", "Mulch, prune, weed"] },
  { name: "'Ole Pau",       phase: 'Waxing', illumination: '69–79%', actions: ["Hoʻonui ends", "Unproductive planting day except for certain vegetables", "Cultivate and prune"] },
  { name: 'Hūnā',           phase: 'Waxing', illumination: '79–87%', actions: ["Poepoe begins", "Plant gourds, ʻuala"] },
  { name: 'Mōhalu',         phase: 'Waxing', illumination: '87–93%', actions: ["Plant anything, especially flowers", "Do not plant trees"] },
  { name: 'Hua',            phase: 'Waxing', illumination: '93–96%', actions: ["Plant anything that bears fruit (hua)"] },
  { name: 'Akua',           phase: 'Waxing', illumination: '96–98%', actions: ["Plant ʻuala, kalo, gourds, maiʻa"] },
  { name: 'Hoku',           phase: 'Full',   illumination: '99–100%',actions: ["Plant anything", "Kalo and maiʻa planted will produce many small fruits/corms"] },
  { name: 'Māhealani',      phase: 'Waning', illumination: '96–98%', actions: ["Plant anything"] },
  { name: 'Kulu',           phase: 'Waning', illumination: '93–96%', actions: ["Plant maiʻa, melons, ʻuala"] },
  { name: "Lāʻau Kū Kahi",  phase: 'Waning', illumination: '87–93%', actions: ["Gather medicinal plants", "Plant maiʻa", "Do not plant ʻuala"] },
  { name: "Lāʻau Kū Lua",   phase: 'Waning', illumination: '79–87%', actions: ["Gather medicinal plants", "Cultivate, don't plant"] },
  { name: "Lāʻau Pau",      phase: 'Waning', illumination: '69–79%', actions: ["Poepoe ends", "Prepare and administer herbal medicine", "Do not plant vines"] },
  { name: "'Ole Kū Kahi",   phase: 'Waning', illumination: '58–69%', actions: ["Emi begins", "Unproductive planting day", "Cultivate, irrigate, prune"] },
  { name: "'Ole Kū Lua",    phase: 'Waning', illumination: '49–58%', actions: ["Unproductive planting day"] },
  { name: "'Ole Pau",       phase: 'Waning', illumination: '40–49%', actions: ["Unproductive planting day", "Plant maiʻa, cultivate others", "Box Jellyfish, Man-O-War"] },
  { name: 'Kāloa Kū Kahi',  phase: 'Waning', illumination: '30–40%', actions: ["Plant long/tall things", "Box Jellyfish, Man-O-War"] },
  { name: 'Kāloa Kū Lua',   phase: 'Waning', illumination: '21–30%', actions: ["Do not plant maiʻa, ʻuala, melon", "Box Jellyfish, Man-O-War"] },
  { name: 'Kāloa Pau',      phase: 'Waning', illumination: '13–21%', actions: ["Plant ʻohe, kō"] },
  { name: 'Kāne',           phase: 'Waning', illumination: '7–13%',  actions: ["Plant anything, especially Kinolau of Kāne", "Night marchers"] },
  { name: 'Lono',           phase: 'Waning', illumination: '3–7%',   actions: ["Plant anything, especially food plants"] },
  { name: 'Mauli',          phase: 'Waning', illumination: '1–3%',   actions: ["Plant anything"] },
  { name: 'Muku',           phase: 'New',    illumination: '0–1%',   actions: ["Lunation ends", "Maiʻa planted will bear muku-length bunches of fruit", "Do not plant kalo, ʻuala"] },
];

@Component({
  selector: 'app-moon-phase',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './moon-phase.component.html',
  styleUrl: './moon-phase.component.css'
})
export class MoonPhaseComponent implements OnInit {
  illumination: number = 0;
  isWaxing: boolean = false;
  phaseLabel: string = '';
  hawaiianPhase: string = '';
  actions: string[] = [];
  nextPhase: string = '';
  nextActions: string[] = [];
  allPhases = PHASES;
  lunarDay: number = 1;

  leftColor: string = DARK_COLOR;
  rightColor: string = DARK_COLOR;
  ellipseColor: string = DARK_COLOR;
  ellipseScaleX: number = 1;
  rotationDeg: number = 0;

  private readonly LAT = 19.7297;
  private readonly LNG = -155.0900;

  ngOnInit(): void {
    const now = new Date();
    const moonIllum = SunCalc.getMoonIllumination(now);
    const moonPos = SunCalc.getMoonPosition(now, this.LAT, this.LNG);
    const phase = moonIllum.phase;

    this.illumination = Math.round(moonIllum.fraction * 100);
    this.isWaxing = phase < 0.5;
    this.phaseLabel = this.isWaxing ? 'Waxing' : 'Waning';
    this.rotationDeg = (moonIllum.angle - moonPos.parallacticAngle) * (180 / Math.PI);

    this.lunarDay = Math.round(phase * 30) || 30;
    const currentPhase = PHASES[this.lunarDay - 1];
    const nextPhaseData = PHASES[this.lunarDay % 30];
    this.hawaiianPhase = currentPhase.name;
    this.actions = currentPhase.actions;
    this.nextPhase = nextPhaseData.name;
    this.nextActions = nextPhaseData.actions;

    this.computeMoonVisual(phase);
  }

  private computeMoonVisual(phase: number): void {
    if (phase < 0.5) {
      this.rightColor = MOON_COLOR;
      this.leftColor = DARK_COLOR;
      if (phase < 0.25) {
        this.ellipseColor = DARK_COLOR;
        this.ellipseScaleX = 1 - phase / 0.25;
      } else {
        this.ellipseColor = MOON_COLOR;
        this.ellipseScaleX = (phase - 0.25) / 0.25;
      }
    } else {
      this.leftColor = MOON_COLOR;
      this.rightColor = DARK_COLOR;
      if (phase < 0.75) {
        this.ellipseColor = MOON_COLOR;
        this.ellipseScaleX = 1 - (phase - 0.5) / 0.25;
      } else {
        this.ellipseColor = DARK_COLOR;
        this.ellipseScaleX = (phase - 0.75) / 0.25;
      }
    }
  }
}
