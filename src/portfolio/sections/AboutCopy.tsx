import {COPY} from '../../data/portfolio';
/* Renders COPY.about paragraph by paragraph (blank line = new paragraph).
   The immersive galaxy journey swaps only the closing sentence. */
export default function AboutCopy({immersive=false}:{immersive?:boolean}){
 const text=immersive?COPY.about.replace(/enjoy peeking at my work!\s*$/,'enjoy your space odyssey!'):COPY.about;
 return <>{text.split(/\n\s*\n/).map((p,i)=><p key={i}>{p.trim()}</p>)}</>;
}
