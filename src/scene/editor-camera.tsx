import { useEffect, useMemo, useRef, type ComponentRef } from 'react';
import { useThree } from '@react-three/fiber';
import {
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from '@react-three/drei';
import {
  OrthographicCamera as ThreeOrthographicCamera,
  PerspectiveCamera as ThreePerspectiveCamera,
  Vector3,
} from 'three';
import { frameRoom } from '@/domain/room-camera';
import { useEditorStore } from '@/features/editor/editor-store';
export function EditorCamera() {
  const {
    room: { dimensions },
    view,
    resetKey,
    cameraAction,
    dragDraft,
  } = useEditorStore();
  const { camera: defaultCamera, size, invalidate } = useThree();
  const perspectiveRef = useRef<ThreePerspectiveCamera>(null);
  const overheadRef = useRef<ThreeOrthographicCamera>(null);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const lastAction = useRef(cameraAction);
  const aspect = size.width / Math.max(1, size.height);
  const frame = useMemo(
    () => frameRoom({ dimensions }, aspect, view),
    [dimensions, aspect, view],
  );
  useEffect(() => {
    const camera =
      view === 'overhead' ? overheadRef.current : perspectiveRef.current;
    if (!camera) return;
    camera.up.set(0, view === 'overhead' ? 0 : 1, view === 'overhead' ? -1 : 0);
    camera.position.set(...frame.position);
    camera.near = frame.near;
    camera.far = frame.far;
    if (camera instanceof ThreeOrthographicCamera) {
      camera.left = -frame.halfWidth;
      camera.right = frame.halfWidth;
      camera.top = frame.halfHeight;
      camera.bottom = -frame.halfHeight;
      camera.zoom = 1;
    }
    camera.lookAt(...frame.target);
    camera.updateProjectionMatrix();
    controls.current?.target.set(...frame.target);
    controls.current?.update();
    invalidate();
  }, [defaultCamera, frame, view, resetKey, invalidate]);
  useEffect(() => {
    const camera =
      view === 'overhead' ? overheadRef.current : perspectiveRef.current;
    if (!camera) return;
    if (
      !cameraAction ||
      !controls.current ||
      lastAction.current === cameraAction
    )
      return;
    lastAction.current = cameraAction;
    const c = controls.current;
    if (cameraAction.type.startsWith('zoom')) {
      const factor = cameraAction.type === 'zoom-in' ? 0.84 : 1 / 0.84;
      if (camera instanceof ThreeOrthographicCamera) {
        camera.zoom = Math.min(20, Math.max(0.05, camera.zoom / factor));
        camera.updateProjectionMatrix();
      } else camera.position.sub(c.target).multiplyScalar(factor).add(c.target);
    } else if (
      cameraAction.type.startsWith('rotate') &&
      view === 'perspective'
    ) {
      camera.position
        .sub(c.target)
        .applyAxisAngle(
          new Vector3(0, 1, 0),
          cameraAction.type === 'rotate-left' ? 0.18 : -0.18,
        )
        .add(c.target);
    } else if (cameraAction.type.startsWith('pan')) {
      const horizontal =
        cameraAction.type === 'pan-left' || cameraAction.type === 'pan-right';
      const direction = new Vector3(
        horizontal ? 1 : 0,
        horizontal ? 0 : 1,
        0,
      ).applyQuaternion(camera.quaternion);
      direction.multiplyScalar(
        frame.radius *
          0.12 *
          (cameraAction.type === 'pan-left' || cameraAction.type === 'pan-down'
            ? -1
            : 1),
      );
      c.target.add(direction);
      camera.position.add(direction);
    }
    c.update();
    invalidate();
  }, [cameraAction, defaultCamera, frame.radius, view, invalidate]);
  return (
    <>
      {view === 'overhead' ? (
        <OrthographicCamera
          ref={overheadRef}
          makeDefault
          manual
          up={[0, 0, -1]}
          near={frame.near}
          far={frame.far}
        />
      ) : (
        <PerspectiveCamera
          ref={perspectiveRef}
          makeDefault
          fov={40}
          near={frame.near}
          far={frame.far}
        />
      )}
      <OrbitControls
        key={view}
        ref={controls}
        makeDefault
        enabled={!dragDraft}
        enableDamping={false}
        enablePan
        enableRotate={view === 'perspective'}
        minDistance={frame.radius * 1.05}
        maxDistance={frame.radius * 20}
        minPolarAngle={view === 'overhead' ? 0 : 0.02}
        maxPolarAngle={view === 'overhead' ? Math.PI : Math.PI / 2.02}
        minZoom={0.05}
        maxZoom={20}
      />
    </>
  );
}
