# CAD model sources

The active glTF models and their binary dependencies were localized from
https://sathyadev07.github.io/sathya-devarajan-portfolio/assets/models/
on 2026-09-12. `source/model-map.js` records the assignments and presentation
angles from the original page. Earlier renamed input files are preserved.

| Active file | Destination | Binary dependency |
| --- | --- | --- |
| `DT27_Rear_Upright.gltf` | Rear upright | `DT27_Rear_Upright0.bin` |
| `Drivetrain27_Asy.gltf` | Full drivetrain assembly | `Drivetrain27_Asy0.bin` |
| `ebike-top-level-assembly.gltf` | Custom Electric Bike | `ebike-top-level-assembly0.bin` |
| `BabaWoodSurface.gltf` | Complex Surface Topography | `BabaWoodSurface0.bin` |

Maintenance notes:

- Keep each glTF file beside its binary dependency. Preserve its original units.
- The Draco loader and decoders are local in `assets/vendor/`, from Three.js r125,
  matching the existing renderer and GLTFLoader.
- Do **not** pre-rotate or pre-scale the asset. The viewer centres it, applies a
  single uniform scale so proportions are preserved, and then applies only the
  presentation rotation recorded in `source/model-map.js`. Adjust that entry if
  the attitude is wrong — never the geometry.
- Decimate to roughly 150k triangles or fewer. The viewer shares a frame budget
  with the galaxy and the stardust field.

These assets are the original portfolio's published models, not reconstructions
of the procedural placeholders in the older React archive. The portfolio must
be served over HTTP for glTF, binary and decoder requests. A failed model load
retains the gallery and displays an explicit fallback message.
