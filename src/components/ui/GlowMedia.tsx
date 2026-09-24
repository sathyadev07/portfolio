import type {ReactNode} from 'react';
import useTilt from '../../hooks/useTilt';
/* The outer frame owns exterior haze and optional tilt together, so its light
   stays attached to the complete media silhouette. */
export default function GlowMedia({tilt=true,className='',children}:{tilt?:boolean;className?:string;children:ReactNode}){
 const pose=useTilt();
 return <div className={`glow-box glow-media-frame ${tilt?'tilt-panel ':''}${className}`.trim()} {...(tilt?pose:{})}>
  <div className="glow-media">{children}</div>
 </div>;
}