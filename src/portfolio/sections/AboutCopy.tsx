import {COPY} from '../../data/portfolio';
export default function AboutCopy({immersive=false}:{immersive?:boolean}){return <><p>{COPY.about.replace(/With that said, enjoy your space odyssey!$/,'').trim()}</p><p>{immersive?'With that said, enjoy your space odyssey!':'With that said, enjoy peeking at my work!'}</p></>;}
