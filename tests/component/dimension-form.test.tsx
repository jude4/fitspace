import { beforeEach, describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DimensionForm } from '@/features/editor/dimension-form';
import { useEditorStore } from '@/features/editor/editor-store';
beforeEach(() =>
  useEditorStore.setState(useEditorStore.getInitialState(), true),
);
describe('room measurement form', () => {
  it('leaves unedited canonical values alone when submitting rounded imperial display', () => {
    useEditorStore
      .getState()
      .execute({ type: 'dimensions', values: { width: 4.123456789 } });
    const room = useEditorStore.getState().room;
    render(<DimensionForm room={room} units="imperial" />);
    fireEvent.click(screen.getByRole('button', { name: 'Apply dimensions' }));
    expect(useEditorStore.getState().room).toBe(room);
    fireEvent.change(screen.getByRole('textbox', { name: 'height feet' }), {
      target: { value: '9' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'height inches' }), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply dimensions' }));
    expect(useEditorStore.getState().room.dimensions.height.meters).toBeCloseTo(
      2.7432,
      8,
    );
    expect(useEditorStore.getState().room.dimensions.width.meters).toBe(
      4.123456789,
    );
  });
  it('shows errors for malformed inputs and never commits them', () => {
    const room = useEditorStore.getState().room;
    render(<DimensionForm room={room} units="metric" />);
    fireEvent.change(screen.getByRole('textbox', { name: 'width in meters' }), {
      target: { value: 'Infinity' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply dimensions' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Width: enter a valid');
    expect(useEditorStore.getState().room).toBe(room);
  });
});
