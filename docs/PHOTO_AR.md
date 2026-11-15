# Photo reference and experimental AR

Phase 6 was explicitly authorized on 2026-11-15. Implementation is available for review; the phase acceptance gate remains open pending physical-device AR validation. Phase 7 is not authorized by this work.

## Photo workflow and limits

1. Open **Room & scene → Photo reference & calibration** in a guest or owned cloud workspace.
2. Select a JPEG or PNG you have permission to use. Limits: 8 MiB compressed, 8192 pixels per side, 24 megapixels. MIME/signature and declared dimensions are checked before decode; decoded dimensions are checked again. Unsupported/invalid files leave an existing valid photo intact.
3. Set reference markers 1–2 and target markers 3–4 by clicking the photo or editing their X/Y percentages. Enter a known reference length in meters (>0 and ≤100 m). Each segment must span at least 1% of the longest image side.
4. Use only segments in the same plane and at the same camera distance. Pixel ratios cannot compensate for perspective, lens distortion or depth. A single reference cannot reconstruct room depth. Repeat with a suitable reference for each axis; in-person measurement is preferable.
5. Review the live estimate and sample dimension comparison. Explicitly apply one approximate dimension within existing room limits. Edits to the photo calibration update the preview; apply again to change the room. Undo/redo restores the prior room value/provenance. Room creation/geometry/spatial analysis continue to use canonical meters.

Applied dimensions use `image_estimated` and **unknown uncertainty**, not user-measured or manufacturer-verified status. The precision of a displayed number is not accuracy. Existing guest local save, JSON export/import, cloud save/reload and immutable snapshots preserve this provenance. Furniture and doorway provenance validation remains unchanged. Apply the new SQL migration before using estimates with a hosted development project.

Images are never transmitted or persisted: the browser decodes a bounded raster and displays a re-encoded JPEG up to 1600 pixels on its longest side, without original metadata. The object URL is revoked on replace/remove/unmount. Photos remain available while the workspace component stays mounted, including closing/reopening the dialog, but leaving/reloading clears them. An estimate carries no image bytes, image path, filename or uploaded-asset reference. Shared snapshots include the applied estimate only. There is no cloud photo-storage feature in this phase.

## Experimental WebXR flow

Open any sample product preview and choose **Try AR at sample scale** if enabled. The application feature-detects secure-context immersive WebXR AR, then requests camera/session permission from the button gesture. It requires `hit-test` and `local-floor`, and optionally uses DOM overlay controls. No external viewer or model service is involved.

Move slowly until a green ring appears on a horizontal surface, then tap to place or reposition. Steep surfaces and missing hits do not place a sample. The original unit-envelope model uses its catalog width/height/depth in meters; pinch scaling is not implemented. Rotate in 45° steps, reset placement, or choose **Return from AR**. The device's system exit control remains available when DOM overlay is unsupported. Initialization errors, denied permission and unsupported browsers retain the normal interactive preview and dimensions. Closing the component/ending AR releases the session and renderer. AR placement does not modify the room or cloud design.

**This is a nominal-scale implementation, not verified physical AR.** Software bounds and simulated API tests cannot establish phone tracking, hardware scale, supported-browser compatibility or real permission/session UX. Spatial fit and delivery remain unguaranteed. iOS Quick Look, Android Scene Viewer, USDZ/GLB downloads and photo reconstruction are not implemented or claimed.

## Verification matrix

| Target                                         | Current evidence                                                                                                  | Acceptance state                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Managed Linux Chromium, 360/1440 px            | Photo review/calibration, persistence, rejection, preview fallback and simulated permission-denial browser checks | Automated checks; visual screenshots inspected |
| Three.js models, all nine concepts             | Software bounding boxes match sample meter dimensions and floor pivot                                             | Engineering scale check only                   |
| Simulated WebXR sessions                       | Horizontal placement, wall/stale-hit rejection, fixed scale during rotation, reset, exit and failure cleanup      | API simulation only                            |
| Compatible physical WebXR AR device over HTTPS | No device available in this environment                                                                           | **Pending; phase gate open**                   |
| Physical iOS/non-WebXR device                  | No device verification; feature-detected fallback implemented                                                     | Pending physical fallback verification         |

Before claiming support for an AR device/browser combination, record device model, OS, browser version, HTTPS origin, permissions outcome and test date. Use known physical references for each model axis and record measured placement error, floor tracking/drift, rotate/reset/reposition, permission denial/retry, system/overlay exit, return navigation and scene preservation. Verify sample dimensions against a tape measure; agree an acceptable error budget and record actual errors rather than inferring accuracy from a bounding box. Do not mark Phase 6 complete or proceed automatically to Phase 7 while these checks are pending.
