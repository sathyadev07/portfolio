export default function Tags({tags}:{tags:string[]}){return <ul className="portfolio-tags od-cluster" aria-label="Tools and methods">{tags.map(tag=><li key={tag}>{tag}</li>)}</ul>;}
