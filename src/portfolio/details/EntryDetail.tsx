import {lazy,Suspense} from 'react';
import {WORK,PROJECTS,MODELS,LOGOS,asset} from '../../data/portfolio';
import Tags from '../../components/Tags';
import MediaGallery from '../media/MediaGallery';
import VideoPlayer from '../media/VideoPlayer';
const ModelViewer=lazy(()=>import('../ModelViewer'));
export default function EntryDetail({id}:{id:string}){
 const item=[...WORK,...PROJECTS].find(x=>x.id===id);if(!item)return <p>Entry unavailable.</p>;
 const logo=LOGOS[id as keyof typeof LOGOS];
 const work='company' in item;
 /* The detail head mirrors the card's two-column grid so the logo, title and
    dates have somewhere real to land. Without a destination for them there is
    nothing for the morph to carry across and they would have to vanish. */
 return <><div className="detail-head">
  {logo?<img className="portfolio-logo" data-morph="logo" src={asset(logo.src)} width={logo.width} height={logo.height} alt={logo.alt}/>:<span className="portfolio-project-index" data-morph="logo">{String(PROJECTS.findIndex(x=>x.id===id)+1).padStart(2,'0')}</span>}
  <div className="od-stack">
   <p className="portfolio-eyebrow" data-morph="eyebrow" {...(work?{}:{'data-morph-fade':''})}>{work?item.company:item.projNumber}</p>
   <h2 id="detail-title" data-morph="title" data-od-id={`detail-title-${id}`} className="portfolio-display">{item.title}</h2>
   <p className="portfolio-meta" data-morph="period">{item.period}</p>
  </div>
 </div><Tags tags={item.tags}/>
 {'stats' in item&&<dl className="portfolio-facts" aria-label="Work highlights">{item.stats.map(stat=><div className="od-stat" key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}</dl>}
 {'summary' in item&&<p className="portfolio-prose">{item.summary}</p>}<h3 className="portfolio-detail-sub">{'company' in item?'What I did':'Engineering notes'}</h3><ul className="portfolio-bullets">{item.bullets.map((bullet,i)=><li key={i}>{bullet}</li>)}</ul>
 {'telemetryNote' in item&&item.telemetryNote&&<aside className="portfolio-note"><h3>{item.telemetryNote.title}</h3><ul>{item.telemetryNote.lines.map(line=><li key={line}>{line}</li>)}</ul></aside>}
 <MediaGallery id={id}/>
 {[id,...(id==='fsae'?['fsae-assembly']:[])].filter(key=>MODELS[key as keyof typeof MODELS]).map(key=><Suspense key={key} fallback={<div className="viewer-loading" role="status">Preparing model viewer…</div>}><ModelViewer modelId={key}/></Suspense>)}
 {id==='proj-03'&&<><h3 className="portfolio-detail-sub">Machining passes</h3><div className="portfolio-videos">{[1,2,3].map(number=><VideoPlayer number={number} key={number}/>)}</div></>}
 </>;
}
