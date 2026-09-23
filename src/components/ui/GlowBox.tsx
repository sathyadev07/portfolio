import type {HTMLAttributes} from 'react';
/* The one box in the system. It draws no border and no ring: `.glow-box` puts
   the dark fill on a feathered ::before and the grey-beige haze on a blurred
   ::after, both behind the content, so the edge dissolves instead of ending.
   `tight` is the button-sized feather — scale is a token, not a variant.
   Elements that already have a semantic tag (a card's <article>, a <button>)
   take the `.glow-box` class directly rather than nesting a wrapper. */
export default function GlowBox({tight,className='',children,...rest}:HTMLAttributes<HTMLDivElement>&{tight?:boolean}){
 return <div className={`glow-box${tight?' glow-tight':''} ${className}`.trim()} {...rest}>{children}</div>;
}
