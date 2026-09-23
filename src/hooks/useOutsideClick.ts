import {useEffect,type RefObject} from 'react';
/* A dismiss listener that cannot fight its own trigger.
   `pointerdown` rather than `click`, so the menu closes on press instead of
   waiting for release. Every ref passed in is exempt — pass both the trigger
   and the panel, or pressing the trigger while open would register as an
   outside press and toggle twice, closing and reopening in one gesture.
   Attached only while active, removed on deactivate and on unmount. */
export default function useOutsideClick(
 active:boolean,
 within:RefObject<HTMLElement|null>[],
 onOutside:()=>void,
){
 useEffect(()=>{
  if(!active)return;
  const handle=(event:PointerEvent)=>{
   const target=event.target as Node|null;
   if(!target)return;
   for(const ref of within)if(ref.current?.contains(target))return;
   onOutside();
  };
  document.addEventListener('pointerdown',handle,true);
  return()=>document.removeEventListener('pointerdown',handle,true);
 },[active,onOutside,within]);
}
