import {useState} from 'react';
import {Play} from 'lucide-react';
import {asset} from '../../data/portfolio';
import GlowMedia from '../../components/ui/GlowMedia';
export default function VideoPlayer({number}:{number:number}){
 const [playing,setPlaying]=useState(false),[failed,setFailed]=useState(false);
 const caption=`Machining Pass ${String(number).padStart(2,'0')}`;
 // Rendered ~330px wide in the video grid; the 1600px JPEG was 425 KB of it.
 const poster=asset('assets/images/w512/topo-06-router.webp');
 return <figure data-od-id={`machining-video-${number}`}>
 {playing
  /* Tilt stays on while playing: useTilt suspends itself on pointerdown, so a
     drag on the scrubber flattens the panel first and lands on real controls. */
  ?<GlowMedia><video controls autoPlay playsInline preload="metadata" poster={poster} src={asset(`assets/video/topo-video-${number}.mp4`)} aria-label={caption} onError={()=>setFailed(true)}/></GlowMedia>
  :<button className="video-poster" data-od-id={`play-machining-${number}`} aria-label={`Play ${caption}`} onClick={()=>setPlaying(true)}><img src={poster} width="1600" height="1205" alt="Router machining the topographic relief" loading="lazy" decoding="async"/><span className="video-play"><Play size={18} strokeWidth={1.5} aria-hidden="true"/> Play {caption}</span></button>}
 <figcaption>{caption}</figcaption>{failed&&<p role="status">Video unavailable. <a href={asset(`assets/video/topo-video-${number}.mp4`)}>Open the video directly</a>.</p>}</figure>;
}
