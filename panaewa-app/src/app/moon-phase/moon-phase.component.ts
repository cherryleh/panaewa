import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as SunCalc from 'suncalc';

const MOON_COLOR = '#f5f3ce';
const DARK_COLOR = '#1a1a2e';

const PHASES = [
  { name: 'Hilo',           phase: 'Waxing', waxing: true,  min: 1,  max: 3,   illumination: '1–3%',    actions: ['Lunation begins', "Plant anything but maiʻa"] },
  { name: 'Hoaka',          phase: 'Waxing', waxing: true,  min: 3,  max: 7,   illumination: '3–7%',    actions: ["Plant ʻuala, tubers"] },
  { name: 'Kū Kahi',        phase: 'Waxing', waxing: true,  min: 7,  max: 13,  illumination: '7–13%',   actions: ["Plant ʻuala, upright (Kū) plants", "One firm, upright shoot will be produced"] },
  { name: 'Kū Lua',         phase: 'Waxing', waxing: true,  min: 13, max: 21,  illumination: '13–21%',  actions: ["Plant ʻuala, kalo, maiʻa, trees", "Two firm, upright shoots will be produced"] },
  { name: 'Kū Kolu',        phase: 'Waxing', waxing: true,  min: 21, max: 30,  illumination: '21–30%',  actions: ["Three firm, upright shoots will be produced"] },
  { name: 'Kū Pau',         phase: 'Waxing', waxing: true,  min: 30, max: 40,  illumination: '30–40%',  actions: ["Plant ʻuala and kalo for firm, upright growth"] },
  { name: "'Ole Kū Kahi",   phase: 'Waxing', waxing: true,  min: 40, max: 49,  illumination: '40–49%',  actions: ["Unproductive planting day", "Cultivate, prune"] },
  { name: "'Ole Kū Lua",    phase: 'Waxing', waxing: true,  min: 49, max: 50,  illumination: '49–50%',  actions: ["Unproductive planting day", "Prune and mulch"] },
  { name: "'Ole",           phase: 'Waxing', waxing: true,  min: 50, max: 50,  illumination: '50%',     actions: ["Perfect half moon", "Unproductive planting day"] },
  { name: "'Ole Kū Kolu",   phase: 'Waxing', waxing: true,  min: 50, max: 69,  illumination: '50–69%',  actions: ["Unproductive planting day", "Mulch, prune, weed"] },
  { name: "'Ole Pau",       phase: 'Waxing', waxing: true,  min: 69, max: 79,  illumination: '69–79%',  actions: ["Hoʻonui ends", "Unproductive planting day except for certain vegetables", "Cultivate and prune"] },
  { name: 'Hūnā',           phase: 'Waxing', waxing: true,  min: 79, max: 87,  illumination: '79–87%',  actions: ["Poepoe begins", "Plant gourds, ʻuala"] },
  { name: 'Mōhalu',         phase: 'Waxing', waxing: true,  min: 87, max: 93,  illumination: '87–93%',  actions: ["Plant anything, especially flowers", "Do not plant trees"] },
  { name: 'Hua',            phase: 'Waxing', waxing: true,  min: 93, max: 96,  illumination: '93–96%',  actions: ["Plant anything that bears fruit (hua)"] },
  { name: 'Akua',           phase: 'Waxing', waxing: true,  min: 96, max: 98,  illumination: '96–98%',  actions: ["Plant ʻuala, kalo, gourds, maiʻa"] },
  { name: 'Hoku',           phase: 'Full',   waxing: false, min: 99, max: 100, illumination: '99–100%', actions: ["Plant anything", "Kalo and maiʻa planted will produce many small fruits/corms"] },
  { name: 'Māhealani',      phase: 'Waning', waxing: false, min: 96, max: 98,  illumination: '96–98%',  actions: ["Plant anything"] },
  { name: 'Kulu',           phase: 'Waning', waxing: false, min: 93, max: 96,  illumination: '93–96%',  actions: ["Plant maiʻa, melons, ʻuala"] },
  { name: "Lāʻau Kū Kahi",  phase: 'Waning', waxing: false, min: 87, max: 93,  illumination: '87–93%',  actions: ["Gather medicinal plants", "Plant maiʻa", "Do not plant ʻuala"] },
  { name: "Lāʻau Kū Lua",   phase: 'Waning', waxing: false, min: 79, max: 87,  illumination: '79–87%',  actions: ["Gather medicinal plants", "Cultivate, don't plant"] },
  { name: "Lāʻau Pau",      phase: 'Waning', waxing: false, min: 69, max: 79,  illumination: '69–79%',  actions: ["Poepoe ends", "Prepare and administer herbal medicine", "Do not plant vines"] },
  { name: "'Ole Kū Kahi",   phase: 'Waning', waxing: false, min: 58, max: 69,  illumination: '58–69%',  actions: ["Emi begins", "Unproductive planting day", "Cultivate, irrigate, prune"] },
  { name: "'Ole Kū Lua",    phase: 'Waning', waxing: false, min: 50, max: 58,  illumination: '50–58%',  actions: ["Unproductive planting day"] },
  { name: "'Ole",           phase: 'Waning', waxing: false, min: 50, max: 50,  illumination: '50%',     actions: ["Perfect half moon", "Unproductive planting day"] },
  { name: "'Ole Pau",       phase: 'Waning', waxing: false, min: 40, max: 50,  illumination: '40–50%',  actions: ["Unproductive planting day", "Plant maiʻa, cultivate others", "Box Jellyfish, Man-O-War"] },
  { name: 'Kāloa Kū Kahi',  phase: 'Waning', waxing: false, min: 30, max: 40,  illumination: '30–40%',  actions: ["Plant long/tall things", "Box Jellyfish, Man-O-War"] },
  { name: 'Kāloa Kū Lua',   phase: 'Waning', waxing: false, min: 21, max: 30,  illumination: '21–30%',  actions: ["Do not plant maiʻa, ʻuala, melon", "Box Jellyfish, Man-O-War"] },
  { name: 'Kāloa Pau',      phase: 'Waning', waxing: false, min: 13, max: 21,  illumination: '13–21%',  actions: ["Plant ʻohe, kō"] },
  { name: 'Kāne',           phase: 'Waning', waxing: false, min: 7,  max: 13,  illumination: '7–13%',   actions: ["Plant anything, especially Kinolau of Kāne", "Night marchers"] },
  { name: 'Lono',           phase: 'Waning', waxing: false, min: 3,  max: 7,   illumination: '3–7%',    actions: ["Plant anything, especially food plants"] },
  { name: 'Mauli',          phase: 'Waning', waxing: false, min: 1,  max: 3,   illumination: '1–3%',    actions: ["Plant anything"] },
  { name: 'Muku',           phase: 'New',    waxing: false, min: 0,  max: 1,   illumination: '0–1%',    actions: ["Lunation ends", "Maiʻa planted will bear muku-length bunches of fruit", "Do not plant kalo, ʻuala"] },
];

function findPhase(illumination: number, isWaxing: boolean) {
  // Special case: exact 50% is the ʻOle half moon
  if (illumination === 50) {
    return PHASES.find(p => p.name === "'Ole" && p.waxing === isWaxing)!;
  }
  // Hoku (full) and Muku (new) are not waxing/waning specific
  if (illumination >= 99) return PHASES.find(p => p.name === 'Hoku')!;
  if (illumination <= 1)  return PHASES.find(p => p.name === 'Muku')!;

  return PHASES.find(p =>
    p.waxing === isWaxing &&
    p.name !== "'Ole" &&
    illumination >= p.min &&
    illumination < p.max
  ) ?? PHASES.find(p => p.name === 'Muku')!;
}

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
  lunarDay: number = 1;
  allPhases = PHASES;

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

    const current = findPhase(this.illumination, this.isWaxing);
    this.lunarDay = PHASES.indexOf(current) + 1;
    this.hawaiianPhase = current.name;
    this.actions = current.actions;

    const nextIndex = (PHASES.indexOf(current) + 1) % PHASES.length;
    this.nextPhase = PHASES[nextIndex].name;
    this.nextActions = PHASES[nextIndex].actions;

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
