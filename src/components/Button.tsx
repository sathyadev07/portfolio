import type { ButtonHTMLAttributes } from 'react';
export default function Button({className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>){return <button type="button" className={`portfolio-button ${className}`} {...props}/>;}
