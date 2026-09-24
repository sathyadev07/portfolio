import {PANEL_TILT_ENABLED} from '../../features';
/* All effects share one clock, including their final-frame holds. */
export const SPRING = 'linear(0.0000,0.0439,0.1424,0.2613,0.3813,0.4924,0.5901,0.6731,0.7420,0.7981,0.8431,0.8788,0.9069,0.9288,0.9458,0.9589,0.9689,0.9765,0.9824,0.9868,0.9901,0.9926,0.9945,0.9959,0.9970,0.9977,0.9983,0.9988,0.9991,0.9993,1.0000)';
/* One duration for both directions, declared once in CSS so the page's other
   motion (phone menu, hover) and this module cannot drift apart. Read
   lazily and cached: at module-evaluation time the stylesheet may not have
   applied yet. 475ms is the fallback, not a second source of truth: it is the
   old 760ms at 1.6x playback speed. Every delay and stagger below is a share
   of this value, so the whole choreography speeds up together. This is the
   timeline length; wall-clock time is it divided by OPEN_RATE / CLOSE_RATE. */
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
/* Playback speed per direction. The timeline itself stays one MORPH_MS long
   and every effect keeps its delay, duration and curve on it; the direction
   only sets how fast that timeline is played. Opening runs 1.5x (475ms plays
   in 316.7ms), closing 1.75x (475ms in 271.4ms, of which the content-fade
   pre-phase is 81.4ms). Because a rate scales every delay, stagger and
   duration together, curve shapes (including the doubled close launch slope)
   are exactly preserved, and a mid-flight reversal only changes the rate —
   no effect timing moves, so nothing can jump. */
export const OPEN_RATE = 1.5;
export const CLOSE_RATE = 1.75;
const FADE = 'cubic-bezier(.4,0,.2,1)';
/* Closing replays the same Animation objects at a negative rate, and reverse
   playback mirrors whatever curve is installed: progress reads as
   1 - E(1 - u). The entrance spring is fast then asymptotically flat, so
   reversed it started slow and finished fast — the acceleration to remove.
   Installing the spring's ease-in counterpart for the closing direction makes
   the reversed playback read as ease-out: cubic-bezier(a,b,c,d) reversed is
   cubic-bezier(1-c,1-d,1-a,1-b).

   Closing starts at twice the old speed. With the first control point on the
   origin, a curve's slope at t=0 is y2/x2, so the reversed curve's launch
   slope is set by the installed curve's first x alone. The old
   cubic-bezier(.42,0,1,1) reversed to (0,0,.58,1): launch slope 1/.58 = 1.72.
   cubic-bezier(.71,0,1,1) reverses to (0,0,.29,1): launch slope 1/.29 = 3.45,
   exactly 2x, over the same duration and landing on the same end pose.

   Only the geometry effects swap, and only from a settled state. Swapping
   mid-flight would move the value at the current time and show up as the
   one-frame teleport this same file works to avoid, so an interrupted reversal
   keeps its curve and the next settled transition installs the right one. */
const CLOSE_MIRROR = 'cubic-bezier(.71,0,1,1)';
/* Closing a dialog is deliberately not a strict mirror. Detail copy must be
   gone before the title travels back through the space it occupied, so the
   last EXIT_SHARE of the timeline — the first stretch of a reverse run — is an
   exit phase: content fades while every geometry effect holds, then geometry
   runs in the time that remains. Open and close timings agree at t=0 and
   t=MORPH_MS, so like the easing they swap only from a settled state. The
   exit curve is installed as ease-in, which reverse playback reads as a fast
   fade-out. Its launch slope is doubled the same way as the geometry's:
   (.4,0,1,1) reversed launched at 1/.6 = 1.67, (.7,0,1,1) reversed launches at
   1/.3 = 3.33.

   The phone popover uses the same exit phase. As a strict mirror its content
   kept the open timing while its geometry ran the close curve, so the two
   drifted apart: at 175ms into the old close the menu had shrunk to 28% and
   sat on the phone button while its number and Call label were still 25-57%
   opaque — the menu content flashing over the button. With the exit phase,
   content is at opacity 0 before the container moves at all. */
const EXIT_SHARE = .3;
const EXIT_EASE = 'cubic-bezier(.7,0,1,1)';
export const reducedMotion = () => matchMedia('(prefers-reduced-motion:reduce)').matches;
/* A shared element carries its type metrics, not just its box. For a text run
   `line` is the first line's own text box, read from a Range: the transform
   pins that box's centre onto the source's, so any sub-pixel difference in
   rounded content-area heights splits evenly above and below instead of
   landing as a visible step at the handover frame. `el` and `text` let the
   morph hide the source copy of a shared element while its destination copy
   is carrying it, and tell identical copies from ones whose words differ. */
export type MorphMetrics = {el:HTMLElement;box:DOMRect;font:number;line:DOMRect|null;lines:number;text:string};
export type SourceGeometry = {surface:HTMLElement;rect:DOMRect;radius:string;shared:Map<string,MorphMetrics>;release:()=>void};
/* A leaf run of text morphs by type size; anything with element children (or no
   text at all, such as the logo image) morphs by box. */
const isTextRun=(el:HTMLElement)=>!el.firstElementChild&&!!el.textContent?.trim();
const readMetrics=(el:HTMLElement):MorphMetrics=>{
  const box=el.getBoundingClientRect(),font=parseFloat(getComputedStyle(el).fontSize)||0;
  let line:DOMRect|null=null,lines=1;
  if(isTextRun(el)){const range=document.createRange();range.selectNodeContents(el);const rects=range.getClientRects();line=rects[0]??null;lines=rects.length}
  return {el,box,font,line,lines,text:(el.textContent??'').replace(/\s+/g,' ').trim()};
};
export function readSource(origin:HTMLElement|null):SourceGeometry|null {
  if(!origin?.isConnected)return null;
  const surface=(origin.closest('.panel-surface')??origin) as HTMLElement;
  const style=getComputedStyle(surface),radius=style.borderRadius;
  /* With tilt off a panel has no pose to freeze: skip the style writes, which
     would otherwise force a style recalc before the rect read below. The rect
     is then the flat layout box and every morph offset is measured from it. */
  const tilted=PANEL_TILT_ENABLED&&surface.matches('.panel-surface,.panel-tilt');
  const transform=tilted?style.transform:'';
  const savedTransform=surface.style.transform,savedTransition=surface.style.transition;
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
  const MORPH_MS=morphMs(),EXIT_MS=Math.round(MORPH_MS*EXIT_SHARE);
  let serial=0,disposed=false,instantTime=0,hinted=false;
  const animations:Animation[]=[];
  // Effects whose timing depends on direction, with both timings.
  const timings=new Map<Animation,{open:OptionalEffectTiming;close:OptionalEffectTiming}>();
  // Each moving element with the properties it animates (see hint()).
  const layers=new Map<HTMLElement,Set<string>>();
  const wrapped:HTMLElement[]=[];
  if(!reducedMotion()&&source){
    const box=host.getBoundingClientRect(),style=getComputedStyle(host),radius=style.borderRadius;
    const baseTransform=style.transform==='none'?'':style.transform;
    const candidates=[...host.querySelectorAll<HTMLElement>('[data-morph]')];
    /* A scaled title only lands on the card's title if both wrap at the same
       words. Capping the destination's measure at the card's measure times the
       type ratio gives both the same line breaks: two identical shapes, so the
       source copy can hand the title over without a visible swap. It is a
       max-width: a destination already narrower is untouched. */
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
      if(!pseudoElement){const props=layers.get(target)??new Set<string>();for(const frame of frames)for(const key of ['transform','opacity'])if(key in frame)props.add(key);if(props.size)layers.set(target,props)}
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
    /* The host itself never fades. For a dialog, fading the host faded the
       shared title with it, so for the first third of the timeline the card's
       title and a half-transparent dialog copy were both on screen, one still
       and one moving: the title's double exposure and hand-over "phase". For
       a popover, an opacity effect on the host (held by fill:'both' once
       settled) makes the host a backdrop root, and its glass ::before then
       blurred nothing: the page's text showed sharp through the open phone
       menu. So only surfaces fade here: the popover's glass fill and haze,
       the dialog's fill (its ::before) and bars. Shared elements are opaque
       from t=0, and everything else fades itself through the rise below. */
    if(options.popover){
      for(const layer of ['::before','::after'])add(host,[{opacity:0},{opacity:1}],{duration:handover,easing:FADE},undefined,layer);
    }else{
      add(host,[{opacity:0},{opacity:1}],{duration:handover,easing:FADE},undefined,'::before');
      for(const bar of host.querySelectorAll<HTMLElement>('.portfolio-dialog-bar'))add(bar,[{opacity:0},{opacity:1}],{duration:handover,easing:FADE});
    }
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
      /* Text: pin the first line's text box. Its inline start lands on the
         source's, and its vertical centre on the source's centre. The
         transform origin is the element's top-left corner, so a point at
         offset o inside the element lands at box + d + scale*o. */
      const fl=text?from.line:null,tl=text?to.line:null;
      const dx=fl&&tl?fl.left-to.box.left-scale*(tl.left-to.box.left):from.box.left+from.box.width/2-to.box.left-to.box.width/2;
      const dy=fl&&tl?fl.top+fl.height/2-to.box.top-scale*(tl.top-to.box.top+tl.height/2):from.box.top+from.box.height/2-to.box.top-to.box.height/2;
      add(el,[{transform:`translate(${dx}px,${dy}px) scale(${scale})`,transformOrigin:origin},{transform:'none',transformOrigin:origin}],geometry,geometryClose);
      /* One element on screen per shared run. When the two copies are the same
         words on the same number of lines, the destination copy lands exactly
         on the source copy, so the source copy is held invisible for the whole
         timeline (fill both covers t=0 and the settled end) and the
         destination copy carries the title alone, fully opaque, from the first
         frame of opening to the last frame of closing. The unmount that ends a
         close cancels this hold in the same commit that removes the dialog, so
         the swap back is between two identical, coincident shapes. Copies that
         differ (a project's number vs its subtitle, or a detail navigated to
         with Previous/Next) keep the cross-fade, since no pose makes them one. */
      const same=!el.hasAttribute('data-morph-fade')&&from.text===to.text&&from.lines===to.lines;
      if(same){
        const hold=new Animation(new KeyframeEffect(from.el,[{opacity:0},{opacity:0}],{duration:MORPH_MS,fill:'both'}),document.timeline);
        hold.currentTime=0;animations.push(hold);
      }else add(el,[{opacity:0},{opacity:1}],{duration:handover,easing:FADE,delay:Math.round(handover*.5)});
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
    for(const [el,props] of layers){
      if(on){el.style.willChange=[...props].join(', ');el.style.backfaceVisibility='hidden'}
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
    hint(true);
    /* An opening from rest starts its clock only after the first frame that
       actually contains the new content has been produced. Mounting a heavy
       detail (dozens of nodes, images, fonts) makes that frame's style,
       layout and paint long on a phone; with the clock already running, most
       of the morph elapsed during that one frame and the box appeared to snap
       open. Held at t=0 the host is clipped exactly to its source, so waiting
       two frames is invisible, and every later frame advances by one frame's
       worth of motion instead of the length of the stall. A close from the
       settled state does the same: the state change that starts it (inert
       body, paused 3D viewers) re-renders React in that first frame, and the
       exit fade would otherwise skip its opening stretch. */
    if((open&&current===0)||(!open&&current===MORPH_MS)){
      for(const a of animations){a.pause();a.currentTime=current}
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
      if(ticket!==serial||disposed)return false;
    }
    const rate=open?OPEN_RATE:-CLOSE_RATE,now=Number(document.timeline.currentTime??performance.now());
    // One start time for every effect, so the whole choreography shares one clock.
    for(const a of animations){a.playbackRate=rate;a.currentTime=current;a.play();a.startTime=now-current/rate}
    await Promise.all(animations.map(a=>a.finished.catch(()=>undefined)));
    const mine=ticket===serial&&!disposed;
    if(mine)hint(false);
    return mine;
  }};
}
