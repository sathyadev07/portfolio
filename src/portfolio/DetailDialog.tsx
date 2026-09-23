import {createPortal} from 'react-dom';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import {WORK,PROJECTS} from '../data/portfolio';
import Button from '../components/Button';
import DetailShell from './details/DetailShell';
import {detailRegistry} from './details/detailRegistry';
const entries=[...WORK,...PROJECTS];
export default function DetailDialog({entryId,onClose,onSelectEntry,origin}:{entryId:string|null;onClose:()=>void;onSelectEntry:(id:string)=>void;origin:HTMLElement|null}){
 if(!entryId)return null;
 const Detail=detailRegistry[entryId as keyof typeof detailRegistry];const index=entries.findIndex(x=>x.id===entryId);
 return createPortal(<DetailShell entryId={entryId} onClose={onClose} origin={origin} footer={index>=0?<footer className="portfolio-dialog-bar"><Button data-od-id="detail-previous" disabled={index===0} onClick={()=>onSelectEntry(entries[index-1].id)}><ArrowLeft size={18} strokeWidth={1.5} aria-hidden="true"/> Previous</Button><span className="portfolio-meta">{index+1} / {entries.length}</span><Button data-od-id="detail-next" disabled={index===entries.length-1} onClick={()=>onSelectEntry(entries[index+1].id)}>Next <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true"/></Button></footer>:undefined}>{Detail?<Detail key={entryId}/>:<h2 id="detail-title">Entry unavailable</h2>}</DetailShell>,document.body);
}
