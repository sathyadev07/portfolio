import {GALLERIES,MEDIA,asset} from '../../data/portfolio';
import GlowMedia from '../../components/ui/GlowMedia';
/* A gallery column is ~508px at desktop width and narrower on one column, so
   the 1800px sources were ~3.5x oversized in the page. The originals stay put
   as the "open full image" target; the img itself picks a rendered-size WebP
   from scripts/optimize-images.mjs. A source already under a step has no
   derivative for it, hence the width filter. */
const SIZES='(min-width:768px) 508px, calc(100vw - 32px)';
const srcSetFor=(file:string,width:number)=>[512,1024]
 .filter(step=>width>step)
 .map(step=>`${asset(`assets/images/w${step}/${file.replace(/\.[^.]+$/,'')}.webp`)} ${step}w`)
 .join(', ');
export default function MediaGallery({id}:{id:string}){const gallery=GALLERIES[id as keyof typeof GALLERIES]??[];return gallery.length?<><h3 className="portfolio-detail-sub">Build media</h3><div className="portfolio-gallery">{gallery.map(([file,caption])=>{const dimensions=MEDIA[file as keyof typeof MEDIA];const set=dimensions?srcSetFor(file,dimensions.width):'';return <figure key={file}><a href={asset(`assets/images/${file}`)} target="_blank" rel="noopener noreferrer" aria-label={`Open full image: ${caption}`}><GlowMedia><img className="od-media" src={asset(`assets/images/${file}`)} {...(set?{srcSet:set,sizes:SIZES}:{})} width={dimensions?.width} height={dimensions?.height} alt={caption} loading="lazy" decoding="async"/></GlowMedia></a><figcaption>{caption}</figcaption></figure>})}</div></>:null;}
