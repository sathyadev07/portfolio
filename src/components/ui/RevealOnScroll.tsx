import type {ReactNode} from 'react';
/* Marks a subtree for the page's shared observer (hooks/useReveal). The class is
   in the markup rather than added by script on purpose: with JS blocked the
   `.reveal` rule is overridden by a `:root:not(.js)` fallback in portfolio.css,
   so nothing is ever left invisible. `step` staggers siblings, capped by the
   caller so a long list does not end up with a one-second tail. */
export default function RevealOnScroll({step=0,className='',children}:{step?:number;className?:string;children:ReactNode}){
 return <div className={`reveal ${className}`.trim()} data-reveal
  style={step?{'--reveal-delay':`calc(${Math.min(step,5)} * var(--reveal-stagger,40ms))`} as React.CSSProperties:undefined}>{children}</div>;
}
