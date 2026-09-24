/* Cool Stuff Mode is switched off for now. Nothing about the galaxy journey has
   been deleted: the scene, the camera rig, the destinations and the toggle
   component all still build. This single flag gates the only two places that
   could reach them — the header control that renders the button and the App
   state that mounts the scene — so restoring the feature is a one-line change
   back to `true` with no other edit anywhere in the tree. */
export const COOL_STUFF_MODE_ENABLED: boolean = false;

/* Panel tilt (the pointer-driven 3D lean on cards, the About panel, media
   frames and the Cool Stuff destinations) is switched off site-wide. The code
   is all kept: useTilt, usePanelTilt, the CSS pose and the morph's pose
   freeze each read this one flag. While it is false the hooks attach no
   pointer listeners, schedule no frames and write no styles, the CSS 3D pose
   (perspective + preserve-3d, which kept every card on its own compositing
   layer) is not applied, and panels render flat. Set it back to `true` to
   restore the tilt with no other edit. */
export const PANEL_TILT_ENABLED: boolean = false;
