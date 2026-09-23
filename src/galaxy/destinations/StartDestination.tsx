import {COPY} from '../../data/portfolio';
export default function StartDestination(){return <section className="journey-start" data-od-id="journey-start"><h1 className="portfolio-display portfolio-name">{COPY.name.split(' ').map(word=><span key={word}>{word}</span>)}</h1></section>;}
