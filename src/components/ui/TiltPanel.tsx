import type {ReactNode} from 'react';
import useTilt from '../../hooks/useTilt';
/* Standalone tilt for content that is not media — the same hook GlowMedia uses,
   exposed so nothing has to re-implement the pointer maths. */
export default function TiltPanel({className='',children}:{className?:string;children:ReactNode}){
 const pose=useTilt();
 return <div className={`tilt-panel ${className}`.trim()} {...pose}>{children}</div>;
}
