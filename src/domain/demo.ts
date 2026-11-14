export const palettes = {
  warm: {
    name: 'Warm minimalism',
    sofa: '#d8c9b0',
    wall: '#dad1bf',
    wood: '#785136',
    rug: '#c9c0ac',
    accent: '#6d5038',
  },
  earthy: {
    name: 'Earth & olive',
    sofa: '#73765b',
    wall: '#d3cbb9',
    wood: '#674832',
    rug: '#c4b69d',
    accent: '#b67750',
  },
  contrast: {
    name: 'Quiet contrast',
    sofa: '#69615b',
    wall: '#e1ded4',
    wood: '#453b32',
    rug: '#cec9c0',
    accent: '#c09c77',
  },
} as const;
export type PaletteId = keyof typeof palettes;
export const demoRoom = {
  width: 6,
  depth: 5,
  height: 3,
  source: 'sample' as const,
};
export const cameraViews = {
  perspective: [9.4, 6.1, 10] as const,
  front: [3, 2.7, 9] as const,
};
export type CameraView = keyof typeof cameraViews;
