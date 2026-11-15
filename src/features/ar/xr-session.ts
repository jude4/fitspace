import {
  AmbientLight,
  DirectionalLight,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  WebGLRenderer,
} from 'three';
import type { Product } from '@/domain/catalog';
import { createSampleModel, disposeModel } from './sample-model';
export type ARHandle = {
  end: () => Promise<void>;
  rotate: () => void;
  reset: () => void;
};
export async function startAR(
  session: XRSession,
  product: Product,
  onStatus: (value: string) => void,
  onEnd: () => void,
): Promise<ARHandle> {
  let renderer: WebGLRenderer | undefined,
    hitSource: XRHitTestSource | undefined;
  let ended = false;
  const scene = new Scene(),
    camera = new PerspectiveCamera(),
    model = createSampleModel(product),
    placement = new Group();
  const reticle = new Mesh(
    new RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: '#b3e3bd' }),
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  placement.visible = false;
  placement.add(model);
  scene.add(placement, reticle, new AmbientLight(0xffffff, 2));
  const light = new DirectionalLight(0xffffff, 3);
  light.position.set(2, 5, 3);
  scene.add(light);
  const cleanup = () => {
    if (ended) return;
    ended = true;
    hitSource?.cancel();
    renderer?.setAnimationLoop(null);
    renderer?.domElement.remove();
    renderer?.dispose();
    disposeModel(model);
    reticle.geometry.dispose();
    reticle.material.dispose();
    session.removeEventListener('select', select);
    session.removeEventListener('end', cleanup);
    onEnd();
  };
  const select = () => {
    if (!reticle.visible) return;
    placement.position.setFromMatrixPosition(reticle.matrix);
    placement.visible = true;
    onStatus(
      'Sample placed at nominal meter scale. Tap another horizontal surface to reposition. Physical scale is not device-verified.',
    );
  };
  session.addEventListener('end', cleanup, { once: true });
  session.addEventListener('select', select);
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true });
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    renderer.domElement.className = 'ar-canvas';
    document.body.appendChild(renderer.domElement);
    await renderer.xr.setSession(session);
    const viewer = await session.requestReferenceSpace('viewer');
    if (!session.requestHitTestSource)
      throw new Error('Surface detection is unavailable.');
    hitSource = await session.requestHitTestSource({ space: viewer });
    if (!hitSource || ended)
      throw new Error('AR session ended before surface detection was ready.');
    const matrix = new Matrix4();
    renderer.setAnimationLoop((_time, frame) => {
      if (!frame || ended || !renderer) return;
      const space = renderer.xr.getReferenceSpace();
      const pose = space
        ? frame.getHitTestResults(hitSource!)[0]?.getPose(space)
        : undefined;
      // Reject wall/steeply tilted hits: the model assumes an upright horizontal floor.
      if (pose) matrix.fromArray(pose.transform.matrix);
      reticle.visible = Boolean(pose && matrix.elements[5] > 0.95);
      if (reticle.visible) reticle.matrix.copy(matrix);
      renderer.render(scene, camera);
    });
    onStatus(
      'Move the camera slowly to find a horizontal floor. Tap when the green ring appears. Stay aware of your surroundings.',
    );
    return {
      end: async () => {
        try {
          await session.end();
        } finally {
          cleanup();
        }
      },
      rotate: () => {
        model.rotation.y += Math.PI / 4;
      },
      reset: () => {
        placement.visible = false;
        model.rotation.y = 0;
        onStatus(
          'Placement cleared. Tap a detected horizontal surface to place again.',
        );
      },
    };
  } catch (error) {
    try {
      await session.end();
    } catch {
      /* Session can end while initialization is pending. */
    }
    cleanup();
    throw error;
  }
}
