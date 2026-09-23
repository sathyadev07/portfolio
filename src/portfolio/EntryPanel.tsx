import {WORK,PROJECTS,LOGOS,asset} from '../data/portfolio';
import Tags from '../components/Tags';
import PanelShell,{type OpenDetail} from './PanelShell';
export default function EntryPanel({id,onOpen}:{id:string;onOpen:OpenDetail}){
 const work=WORK.find(x=>x.id===id),project=PROJECTS.find(x=>x.id===id),item=work??project;if(!item)return null;
 const logo=LOGOS[id as keyof typeof LOGOS];
 return <PanelShell id={id} title={item.title} onOpen={onOpen} kind={work?'work':'project'}>
 {work&&logo?<img className="portfolio-logo" data-morph="logo" src={asset(logo.src)} width={logo.width} height={logo.height} alt={logo.alt} loading="lazy"/>:<span className="portfolio-project-index" data-morph="logo">{String(PROJECTS.findIndex(x=>x.id===id)+1).padStart(2,'0')}</span>}
 <div className="od-stack"><p className="portfolio-eyebrow" data-morph="eyebrow">{work?.company??project?.subtitle}</p><h3 className="portfolio-display" data-morph="title" data-od-id={`portfolio-title-${id}`}>{item.title}</h3><p className="portfolio-meta" data-morph="period">{item.period}</p>{project&&<p className="portfolio-prose">{project.summary}</p>}<Tags tags={item.tags}/></div>
 </PanelShell>;
}
