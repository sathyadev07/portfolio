/* All effects share one clock, including their final-frame holds. */
export const SPRING = 'linear(0.0000,0.0439,0.1424,0.2613,0.3813,0.4924,0.5901,0.6731,0.7420,0.7981,0.8431,0.8788,0.9069,0.9288,0.9458,0.9589,0.9689,0.9765,0.9824,0.9868,0.9901,0.9926,0.9945,0.9959,0.9970,0.9977,0.9983,0.9988,0.9991,0.9993,1.0000)';
/* One duration for both directions, declared once in CSS so the page's other
   motion (reveal, phone menu, hover) and this module cannot drift apart. Read
   lazily and cached: at module-evaluation time the stylesheet may not have
   applied yet. 475ms is the fallback, not a second source of truth: it is the
   old 760ms at 1.6x playback speed. Every delay and stagger below is a share
   of this value, so the whole choreography speeds up together. */
let resolvedMs = 0;
export function morphMs(){
  if(resolvedMs)return resolvedMs;
  const raw=typeof document!=='undefined'
    ? getComputedStyle(document.documentElement).getPropertyValue('--anim-duration').trim()
    : '';
  const value=parseFloat(raw);
  resolvedMs=Number.isFinite(value)&&value>0?(raw.endsWith('ms')?value:value*1000):475;
  return resolvedMs;
}
const FADE = 'cubic-bezier(.4,0,.2,1)';
/* Closing replays the same Animation objects at playbackRate -1, and reverse
   playback mirrors whatever curve is installed: progress reads as
   1 - E(1 - u). The entrance spring is fast then asymptotically flat, so
   reversed it started slow and finished fast — the acceleration to remove.
   Installing the spring's ease-in counterpart for the closing direction makes
   the reversed playback read as ease-out, since cubic-bezier(.42,0,1,1)
   reversed is exactly cubic-bezier(0,0,.58,1).

   Only the geometry effects swap, and only from a settled state. Swapping
   mid-flight would move the value at the current time and show up as the
   one-frame teleport this same file works to avoid, so an interrupted reversal
   keeps its curve and the next settled transition installs the right one. */
const CLOSE_MIRROR = 'cubic-bezier(.42,0,1,1)';
/* Closing a dialog is deliberately not a strict mirror. Detail copy must be
   gone before the title travels back through the space it occupied, so the
   last EXIT_SHARE of the timeline — the first stretch of a reverse run — is an
   exit phase: content fades while every geometry effect holds, then geometry
   runs in the time that remains. Open and close timings agree at t=0 and
   t=MORPH_MS, so like the easing they swap only from a settled state. The
   exit curve is installed as ease-in, which reverse playback reads as a fast
   fade-out. Popovers keep the strict mirror. */
const EXIT_SHARE = .3;
const EXIT_EASE = 'cubic-bezier(.4,0,1,1)';
export const reducedMotion = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
/* A shared element carries its type metrics, not just its box. `lead` is the
   half-leading above the first line's em box, which is exact rather than an
   ascent guess, so aligning em-box tops needs no fudge factor. */
export type MorphMetrics = {box:DOMRect;font:number;lead:number};
export type SourceGeometry = {surface:HTMLElement;rect:DOMRect;radius:string;shared:Map<string,MorphMetrics>;release:()=>void};
const readMetrics=(el:HTMLElement):MorphMetrics=>{
  const box=el.getBoundingClientRect(),style=getComputedStyle(el);
  const font=parseFloat(style.fontSize)||0,line=parseFloat(style.lineHeight);
  return {box,font,lead:Number.isFinite(line)?(line-font)/2:0};
};
/* A leaf run of text morphs by type size; anything with element children (or no
   text at all, such as the logo image) morphs by box. */
const isTextRun=(el:HTMLElement)=>!el.firstElementChild&&!!el.textContent?.trim();
export function readSource(origin:HTMLElement|null):SourceGeometry|null {
  if(!origin?.isConnected)return null;
  const surface=(origin.closest('.panel-surface')??origin) as HTMLElement;
  const style=getComputedStyle(surface),radius=style.borderRadius,transform=style.transform;
  const savedTransform=surface.style.transform,savedTransition=surface.style.transition;
  const tilted=surface.matches('.panel-surface,.panel-tilt');
  // Freeze the visible pose, including a currently running CSS transition.
  if(tilted){surface.style.transition='none';surface.style.transform=transform}
  const release=()=>{if(tilted){surface.style.removeProperty('--tilt-x');surface.style.removeProperty('--tilt-y');surface.style.transition=savedTransition;surface.style.transform=savedTransform}};
  const rect=surface.getBoundingClientRect();
  if(!rect.width||!rect.height){release();return null}
  const shared=new Map<string,MorphMetrics>();
  for(const el of surface.querySelectorAll<HTMLElement>('[data-morph]')){const metrics=readMetrics(el);if(metrics.box.width&&metrics.box.height)shared.set(el.dataset.morph!,metrics)}
  return {surface,rect,radius,shared,release};
}
export type Morph={play:(open:boolean)=>Promise<boolean>;cancel:()=>void;seek:(time:number)=>void;time:()=>number};
const clipWithin=(host:DOMRect,from:DOMRect,radius:string)=>`inset(${Math.max(0,from.top-host.top)}px ${Math.max(0,host.right-from.right)}px ${Math.max(0,host.bottom-from.bottom)}px ${Math.max(0,from.left-host.left)}px round ${radius})`;
export function buildMorph(host:HTMLElement,source:SourceGeometry|null,options:{popover?:boolean}={}):Morph {
  const MORPH_MS=morphMs(),EXIT_MS=options.popover?0:Math.round(MORPH_MS*EXIT_SHARE);
  let serial=0,disposed=false,instantTime=0,hinted=false;
  const animations:Animation[]=[];
  // Effects whose timing depends on direction, with both timings.
  const timings=new Map<Animation,{open:OptionalEffectTiming;close:OptionalEffectTiming}>();
  const layers=new Set<HTMLElement>();
  const wrapped:HTMLElement[]=[];
  if(!reducedMotion()&&source){
    const box=host.getBoundingClientRect(),style=getComputedStyle(host),radius=style.borderRadius;
    const baseTransform=style.transform==='none'?'':style.transform;
    const candidates=[...host.querySelectorAll<HTMLElement>('[data-morph]')];
    /* A scaled title only lands on the card's title if both wrap at the same
       words. Capping the destination's measure at the card's measure times the
       type ratio gives both the same line breaks, so the final handover
       cross-fades two identical shapes instead of two differently wrapped
       copies. It is a max-width: a destination already narrower is untouched. */
    const fonts=candidates.map(el=>parseFloat(getComputedStyle(el).fontSize)||0);
    candidates.forEach((el,i)=>{
      const from=source.shared.get(el.dataset.morph!);
      if(from&&isTextRun(el)&&from.font>0&&fonts[i]>0){el.style.maxWidth=`${Math.ceil(from.box.width*fonts[i]/from.font)+1}px`;wrapped.push(el)}
    });
    // Batch every geometry read before constructing effects.
    const shared=candidates.map(el=>({el,from:source.shared.get(el.dataset.morph!),to:readMetrics(el)}));
    const rise=[...host.querySelectorAll<HTMLElement>('.detail-content > *, .portfolio-dialog-bar > *, [data-morph-rise] > *')].filter(el=>!el.matches('[data-morph]')&&!el.querySelector('[data-morph]'));
    const add=(target:HTMLElement,frames:Keyframe[],open:{duration:number;easing:string;delay?:number},close?:OptionalEffectTiming,pseudoElement?:string)=>{
      const delay=open.delay??0;
      const openTiming:OptionalEffectTiming={delay,duration:open.duration,endDelay:MORPH_MS-delay-open.duration,easing:open.easing};
      const effect=new KeyframeEffect(target,frames,{...openTiming,fill:'both',pseudoElement});
      const a=new Animation(effect,document.timeline);a.currentTime=0;animations.push(a);
      if(close)timings.set(a,{open:openTiming,close});
      if(!pseudoElement)layers.add(target);
    };
    const geometry={duration:MORPH_MS,easing:SPRING};
    const geometryClose:OptionalEffectTiming={delay:0,duration:MORPH_MS-EXIT_MS,endDelay:EXIT_MS,easing:CLOSE_MIRROR};
    const exitClose:OptionalEffectTiming|undefined=EXIT_MS?{delay:MORPH_MS-EXIT_MS,duration:EXIT_MS,endDelay:0,easing:EXIT_EASE}:undefined;
    if(options.popover){
      /* Its trigger is outside the popover. One uniform scale, centred on the
         trigger: separate x and y ratios squashed the menu's text and haze
         into the trigger's square while it grew, which read as jitter. Keep
         any CSS centering transform instead of replacing its anchor. */
      const s=Math.min(1,Math.max(.05,Math.min(source.rect.width/box.width,source.rect.height/box.height)));
      const tx=source.rect.left+source.rect.width/2-box.left-s*box.width/2,ty=source.rect.top+source.rect.height/2-box.top-s*box.height/2;
      add(host,[{transform:`translate(${tx}px,${ty}px) ${baseTransform} scale(${s})`,transformOrigin:'0 0'},{transform:baseTransform||'none',transformOrigin:'0 0'}],geometry,geometryClose);
    }else add(host,[{clipPath:clipWithin(box,source.rect,source.radius)},{clipPath:`inset(0px 0px 0px 0px round ${radius})`}],geometry,geometryClose);
    const handover=Math.round(MORPH_MS*.34);
    add(host,[{opacity:0},{opacity:1}],{duration:handover,easing:FADE});
    if(!options.popover){
      /* The card must be fully opaque and undimmed under the dialog before
         the dialog fades off it. Fading both at once dipped the title's
         brightness mid-handover — the close "blink" — and a backdrop still
         dimming the page made the revealed card read darker than the dialog
         copy it replaced. So in timeline order: the dialog becomes opaque,
         then the card goes (hidden underneath), then the page dims. Closing
         plays this backwards. */
      const cardOut=Math.round(handover*.75);
      add(source.surface,[{opacity:1},{opacity:0}],{duration:handover-cardOut,easing:FADE,delay:cardOut});
      add(host,[{opacity:0},{opacity:1}],{duration:Math.round(MORPH_MS*.26),easing:FADE,delay:handover},undefined,'::backdrop');
    }
    for(const {el,from,to} of shared){
      if(!from||!to.box.width||!to.box.height)continue;
      /* Text cannot take its scale from box width. A card h3 and a dialog h2 both
         fill their column, so the width ratio reports ~1 while the glyphs jump
         32px -> 48px, and the title reads as a snap rather than a morph. Font
         size is the honest ratio, anchored at the em box's inline start so the
         first glyph holds still even when the two wrap differently. */
      const text=isTextRun(el)&&from.font>0&&to.font>0;
      const raw=text?from.font/to.font:from.box.width/to.box.width;
      const scale=Math.min(5,Math.max(.2,raw));
      const origin=text?'0 0':'50% 50%';
      const dx=text?from.box.left-to.box.left:from.box.left+from.box.width/2-to.box.left-to.box.width/2;
      const dy=text?from.box.top-to.box.top+(from.lead-to.lead*scale):from.box.top+from.box.height/2-to.box.top-to.box.height/2;
      add(el,[{transform:`translate(${dx}px,${dy}px) scale(${scale})`,transformOrigin:origin},{transform:'none',transformOrigin:origin}],geometry,geometryClose);
      if(el.hasAttribute('data-morph-fade'))add(el,[{opacity:0},{opacity:1}],{duration:handover,easing:FADE,delay:Math.round(handover*.5)});
    }
    // 26ms of stagger at the old 760ms clock, kept as a share of the clock.
    const stagger=Math.round(MORPH_MS*26/760);
    rise.forEach((el,i)=>add(el,[{opacity:0,transform:'translateY(14px) scale(.985)'},{opacity:1,transform:'none'}],{duration:Math.round(MORPH_MS*.55),easing:FADE,delay:Math.round(MORPH_MS*.16)+Math.min(i,7)*stagger},exitClose));
  }
  /* Promote only the elements actually moving, only while they move. A held
     fractional transform on a non-composited element is what makes text look
     soft mid-morph, and a will-change left behind keeps the layer alive for
     the rest of the session. */
  const hint=(on:boolean)=>{
    if(hinted===on)return;hinted=on;
    for(const el of layers){
      if(on){el.style.willChange='transform, opacity';el.style.backfaceVisibility='hidden'}
      else{el.style.removeProperty('will-change');el.style.removeProperty('backface-visibility')}
    }
  };
  const time=()=>animations.length?Math.max(0,Math.min(MORPH_MS,Number(animations[0].currentTime??0))):instantTime;
  const seek=(value:number)=>{serial++;instantTime=Math.max(0,Math.min(MORPH_MS,value));for(const a of animations){a.pause();a.currentTime=instantTime}};
  return {time,seek,cancel(){disposed=true;serial++;hint(false);for(const a of animations)a.cancel();for(const el of wrapped)el.style.removeProperty('max-width')},async play(open){
    const ticket=++serial;if(disposed)return false;
    const current=time(),target=open?MORPH_MS:0;
    if(!animations.length||reducedMotion()||current===target){instantTime=target;hint(false);for(const a of animations){a.pause();a.currentTime=target}return ticket===serial&&!disposed}
    if(current===0||current===MORPH_MS)for(const [a,t] of timings)a.effect?.updateTiming(open?t.open:t.close);
    const direction=open?1:-1,now=Number(document.timeline.currentTime??performance.now());
    hint(true);
    for(const a of animations){a.playbackRate=direction;a.currentTime=current;a.play();a.startTime=now-current/direction}
    await Promise.all(animations.map(a=>a.finished.catch(()=>undefined)));
    const mine=ticket===serial&&!disposed;
    if(mine)hint(false);
    return mine;
  }};
}
