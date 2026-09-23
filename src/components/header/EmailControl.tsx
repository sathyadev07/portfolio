import {COPY,asset} from '../../data/portfolio';
export default function EmailControl(){return <a className="contact-control" data-od-id="email-control" href={`mailto:${COPY.email}`} aria-label={`Email ${COPY.email}`}><img src={asset('assets/logos/email.png')} width="512" height="512" alt=""/></a>;}
