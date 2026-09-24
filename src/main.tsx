import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import {PANEL_TILT_ENABLED} from './features';
import './styles/tokens.css';

// The CSS tilt pose keys off this attribute, so the one flag gates CSS and hooks alike.
if(PANEL_TILT_ENABLED)document.documentElement.dataset.panelTilt='';

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
