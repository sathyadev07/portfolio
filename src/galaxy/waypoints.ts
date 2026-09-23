import {WORK,PROJECTS} from '../data/portfolio';
export type Destination={id:string;kind:'hero'|'about'|'experience'|'project';label:string};
/* The odyssey order. There is no overview stop: every experience and project is
   only ever seen at its own point in the galaxy. */
export const DESTINATIONS:Destination[]=[
 {id:'hero',kind:'hero',label:'Sathya Devarajan'},
 {id:'about',kind:'about',label:'About'},
 ...WORK.map(item=>({id:item.id,kind:'experience' as const,label:item.title})),
 ...PROJECTS.map(item=>({id:item.id,kind:'project' as const,label:item.title}))
];
