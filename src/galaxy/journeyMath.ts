export type JourneyState={stop:number;from:number;to:number;t:number;velocity:number;intent:number;phase:'dwell'|'travel';arrivalAge:number};
export const wrap=(value:number,count:number)=>((value%count)+count)%count;
export const createJourney=():JourneyState=>({stop:0,from:0,to:1,t:0,velocity:0,intent:0,phase:'dwell',arrivalAge:1});
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
// Input adds velocity rather than selecting a destination. A settled destination
// absorbs the tail of the previous gesture and needs renewed deliberate input.
export function impulse(s:JourneyState,pixels:number){
 const delta=clamp(pixels,-100,100);if(!delta)return;
 if(s.phase==='dwell'){
  if(s.arrivalAge<.45)return;
  if(Math.sign(delta)!==Math.sign(s.intent))s.intent=0;
  s.intent+=delta;
  if(Math.abs(s.intent)<155)return;
  s.from=s.stop;s.to=s.stop+Math.sign(s.intent);s.t=0;s.velocity=.26;s.phase='travel';s.intent=0;
 }else s.velocity=clamp(s.velocity+delta*Math.sign(s.to-s.from)*.003,-.5,.62);
}
export function advance(s:JourneyState,dt:number){
 dt=clamp(dt,0,.05);
 if(s.phase==='dwell'){s.arrivalAge+=dt;s.intent*=Math.exp(-dt*.8);return}
 // A committed gesture completes naturally; reversing first brakes, then returns.
 // The cruise speed is slow enough that a leg is several seconds of real travel
 // through the star field rather than a cut between two stops.
 const direction=s.velocity<0?-1:1;
 s.velocity+=(direction*.2-s.velocity)*(1-Math.exp(-dt*1.1));
 s.t+=s.velocity*dt;
 if(s.t>=1||s.t<=0&&s.velocity<0){
  s.stop=s.t>=1?s.to:s.from;s.from=s.stop;s.to=s.stop+1;s.t=0;s.velocity=0;s.intent=0;s.phase='dwell';s.arrivalAge=0;
 }
}
/* The continuous journey scalar in destination units, eased so departure and
   arrival are smooth while the value itself only ever moves one way per leg. */
export function journeyPosition(s:JourneyState){return s.phase==='travel'?s.from+(s.to-s.from)*(s.t*s.t*(3-2*s.t)):s.stop}
