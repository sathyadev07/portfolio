import {useRef,type PointerEvent} from 'react';
import {PANEL_TILT_ENABLED} from '../features';
function usePanelTiltLive(){
 const bounds=useRef<DOMRect|null>(null),strength=useRef(4);
 const reset=(event:PointerEvent<HTMLElement>)=>{bounds.current=null;event.currentTarget.style.removeProperty('--tilt-x');event.currentTarget.style.removeProperty('--tilt-y')};
 return {onPointerEnter:(event:PointerEvent<HTMLElement>)=>{bounds.current=event.currentTarget.getBoundingClientRect();strength.current=Number(getComputedStyle(event.currentTarget).getPropertyValue('--tilt-range'))||4},onPointerMove:(event:PointerEvent<HTMLElement>)=>{
  if(event.pointerType!=='mouse'||!matchMedia('(hover:hover) and (pointer:fine)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches){reset(event);return}
  const b=bounds.current;if(!b||!b.width||!b.height)return;
  const x=Math.max(-.5,Math.min(.5,(event.clientX-b.left)/b.width-.5)),y=Math.max(-.5,Math.min(.5,(event.clientY-b.top)/b.height-.5));
  const range=strength.current;
  event.currentTarget.style.setProperty('--tilt-x',`${-y*range}deg`);
  event.currentTarget.style.setProperty('--tilt-y',`${x*range}deg`);
 },onPointerLeave:reset,onPointerCancel:reset};
}
type PanelTiltProps=Partial<ReturnType<typeof usePanelTiltLive>>;
// Tilt off: nothing to spread, so the panel gets no pointer handlers at all.
const NO_TILT:PanelTiltProps=Object.freeze({});
function usePanelTiltOff():PanelTiltProps{return NO_TILT}
const usePanelTilt:()=>PanelTiltProps=PANEL_TILT_ENABLED?usePanelTiltLive:usePanelTiltOff;
export default usePanelTilt;
