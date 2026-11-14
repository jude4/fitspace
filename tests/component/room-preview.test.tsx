import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomPreview } from '@/features/landing/room-preview';
import { useDemoStore } from '@/features/landing/demo-store';
vi.mock('next/dynamic', () => ({
  default: () =>
    function CanvasMock() {
      return <div>Renderer loaded</div>;
    },
}));
let reduced = false;
beforeEach(() => {
  reduced = false;
  useDemoStore.setState({
    palette: 'warm',
    furnished: true,
    motion: false,
    view: 'perspective',
  });
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
describe('room preview controls and fallback', () => {
  it('shows an actionable WebGL fallback without hiding comparison controls', async () => {
    render(<RoomPreview />);
    expect(
      await screen.findByRole('heading', { name: 'The room needs WebGL' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reload preview' }),
    ).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Before' }));
    expect(screen.getByRole('button', { name: 'Before' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('room-scene')).toHaveAttribute(
      'data-furnished',
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Earth & olive' }));
    expect(screen.getByTestId('room-scene')).toHaveAttribute(
      'data-palette',
      'earthy',
    );
  });
  it('disables automatic motion under a reduced-motion preference', () => {
    reduced = true;
    useDemoStore.setState({ motion: true });
    render(<RoomPreview />);
    expect(
      screen.getByRole('button', {
        name: 'Camera motion disabled by reduced-motion preference',
      }),
    ).toBeDisabled();
    expect(screen.getByTestId('room-scene')).toHaveAttribute(
      'data-motion',
      'false',
    );
  });
});
