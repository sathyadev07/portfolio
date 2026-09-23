/* Which device the user is actually driving right now.

   Closing a detail restores focus to the card that opened it, which is the
   correct thing to do and is also what left an amber border sitting on that
   card after every mouse round-trip. :focus-visible alone does not settle it:
   for a programmatic focus() the browser falls back to a heuristic, and that
   heuristic resolves to "visible" often enough to strand the highlight.

   So we state the modality outright and hand it to focus({focusVisible}), which
   is a real FocusOptions member rather than a guess. A pointer user gets focus
   back with no ring; a keyboard user gets focus back with one. Nobody loses
   focus, which is what makes this different from papering over it with blur(). */
/* FocusOptions.focusVisible is in the HTML spec and shipped, but not yet in
   the TS DOM lib. */
declare global{interface FocusOptions{focusVisible?:boolean}}

let keyboard=false;
if(typeof window!=='undefined'){
 addEventListener('keydown',event=>{if(!event.metaKey&&!event.altKey&&!event.ctrlKey)keyboard=true},true);
 addEventListener('pointerdown',()=>{keyboard=false},true);
}
export const isKeyboardModality=()=>keyboard;
