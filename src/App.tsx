import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import Header from './components/header/Header';
import {COOL_STUFF_MODE_ENABLED} from './features';
import GalaxyBackground from './galaxy/GalaxyBackground';
import PortfolioContent from './portfolio/PortfolioContent';
import DetailDialog from './portfolio/DetailDialog';
const GalaxyScene=lazy(()=>import('./galaxy/GalaxyScene'));
export default function App(){
 const [requested,setRequested]=useState(false),[detailId,setDetailId]=useState<string|null>(null);
 const enabled=COOL_STUFF_MODE_ENABLED&&requested;
 const origin=useRef<HTMLElement|null>(null),pageScroll=useRef(0);
 const open=useCallback((id:string,element?:HTMLElement)=>{origin.current=element??document.activeElement as HTMLElement;setDetailId(id)},[]);
 const exit=useCallback(()=>setRequested(false),[]);
 useEffect(()=>{if(enabled)pageScroll.current=window.scrollY;document.documentElement.classList.toggle('mode-galaxy',enabled);if(!enabled)window.scrollTo({top:pageScroll.current,behavior:'instant'});return()=>document.documentElement.classList.remove('mode-galaxy')},[enabled]);
 return <><a className="portfolio-skip" href="#main-content">Skip to portfolio content</a><Header enabled={enabled} onToggle={()=>{if(COOL_STUFF_MODE_ENABLED)setRequested(x=>!x)}}/>{enabled?<Suspense fallback={<p className="galaxy-status" role="status">Preparing the odyssey…</p>}><GalaxyScene paused={!!detailId} onOpenDetail={open} onExit={exit}/></Suspense>:<><GalaxyBackground/><PortfolioContent onOpenDetail={open}/></>}<DetailDialog entryId={detailId} origin={origin.current} onClose={()=>setDetailId(null)} onSelectEntry={setDetailId}/></>;
}
