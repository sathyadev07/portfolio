import type {ReactNode} from 'react';
import {ArrowUpRight} from 'lucide-react';
import usePanelTilt from '../hooks/usePanelTilt';
export type OpenDetail=(id:string,origin?:HTMLElement)=>void;
export default function PanelShell({id,title,onOpen,children,kind}:{id:string;title:string;onOpen:OpenDetail;children:ReactNode;kind:'work'|'project'}){
 const tilt=usePanelTilt();
 /* DetailShell freezes the visible pose and owns its release after closing. */
 function open(event:React.MouseEvent<HTMLButtonElement>){
  onOpen(id,event.currentTarget);
 }
 return <article id={id} className={`portfolio-${kind} panel-surface interactive-panel`} data-od-id={`portfolio-card-${id}`} {...tilt}>
 <button className="panel-hit" aria-label={`Read ${title}`} aria-haspopup="dialog" data-od-id={`open-detail-${id}`} onClick={open}><span className="sr-only">Read {title}</span></button>{children}<ArrowUpRight className="panel-arrow" size={24} strokeWidth={1.5} aria-hidden="true"/>
 </article>;
}
