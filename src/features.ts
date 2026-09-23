/* Cool Stuff Mode is switched off for now. Nothing about the galaxy journey has
   been deleted: the scene, the camera rig, the destinations and the toggle
   component all still build. This single flag gates the only two places that
   could reach them — the header control that renders the button and the App
   state that mounts the scene — so restoring the feature is a one-line change
   back to `true` with no other edit anywhere in the tree. */
export const COOL_STUFF_MODE_ENABLED: boolean = false;
