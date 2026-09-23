import {useEffect} from 'react';
/* One observer for the whole page, not one per element.
   Elements opt in with [data-reveal]; the hook adds them as they mount and
   unobserves each on its first intersection, so a revealed element costs
   nothing afterwards and never re-animates when a card expands.
   Anything already on screen at first paint is marked visible without a
   transition: fading in the hero would cost LCP and flash. */
let observer:IntersectionObserver|null=null;
const show=(el:Element)=>{el.classList.add('is-visible');(el as HTMLElement).style.removeProperty('will-change')};
function shared(){
 if(observer)return observer;
 observer=new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){show(entry.target);observer?.unobserve(entry.target)}
 },{threshold:0,rootMargin:'0px 0px -5% 0px'});
 return observer;
}
export default function useReveal(root:{current:HTMLElement|null}){
 useEffect(()=>{
  const host=root.current;if(!host)return;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const io='IntersectionObserver' in window?shared():null,watched=new Set<Element>();
  const register=(el:HTMLElement,initial=false)=>{
   if(el.classList.contains('is-visible')||watched.has(el))return;
   const rect=initial?el.getBoundingClientRect():null;
   // Above the fold on first paint: present immediately, no transition.
   if(!io||reduced.matches||(rect&&rect.height>0&&rect.bottom>0&&rect.top<innerHeight*.9)){show(el);return}
   el.style.willChange='opacity, transform';
   watched.add(el);io.observe(el);
  };
  const registerTree=(node:Element,initial=false)=>{
   if(node instanceof HTMLElement&&node.matches('[data-reveal]'))register(node,initial);
   node.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el=>register(el,initial));
  };
  registerTree(host,true);
  // Detail galleries can replace their children without remounting the owner.
  const mutations=new MutationObserver(records=>{
   for(const record of records)for(const node of record.addedNodes){
    if(node instanceof Element)registerTree(node);
   }
   for(const el of watched)if(!host.contains(el)){io?.unobserve(el);watched.delete(el)}
  });
  mutations.observe(host,{childList:true,subtree:true});
  const revealWithoutMotion=()=>{
   if(!reduced.matches)return;
   host.querySelectorAll('[data-reveal]').forEach(show);
   for(const el of watched)io?.unobserve(el);
   watched.clear();
  };
  reduced.addEventListener('change',revealWithoutMotion);
  return()=>{
   mutations.disconnect();reduced.removeEventListener('change',revealWithoutMotion);
   for(const el of watched)io?.unobserve(el);
  };
 },[root]);
}
