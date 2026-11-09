import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import ImageLightbox, { LightboxImage } from '@/components/chat/ImageLightbox';
import MessageBubble from '@/components/chat/MessageBubble';
import { safeMediaUrl } from '@/lib/safeUrl';
import { Message } from '@/types';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'me', username: 'me' } }),
}));

// jsdom has no PointerEvent, so pointer events lose clientX/pointerId without this
if (!('PointerEvent' in window)) {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  Object.assign(window, { PointerEvent: PointerEventPolyfill });
}

const toastError = vi.fn();
vi.mock('react-hot-toast', () => ({ default: { error: (...args: unknown[]) => toastError(...args) } }));

const images: LightboxImage[] = [
  { id: 'a', src: 'http://localhost:5000/uploads/a.jpg', name: 'a.jpg' },
  { id: 'b', src: 'http://localhost:5000/uploads/b.jpg', name: 'b.jpg', caption: 'sunset' },
  { id: 'c', src: 'http://localhost:5000/uploads/c.jpg', name: 'c.jpg' },
];

function Harness({ start = 0, onClose = () => {} }: { start?: number; onClose?: () => void }) {
  const [index, setIndex] = useState(start);
  return <ImageLightbox images={images} index={index} onIndexChange={setIndex} onClose={onClose} />;
}

const imageMessage = (overrides: Partial<Message> = {}): Message => ({
  _id: 'm1',
  conversationId: 'c1',
  senderId: { _id: 'other', username: 'other', avatar: '' },
  text: '',
  isRead: true,
  fileUrl: 'http://localhost:5000/uploads/a.jpg',
  fileType: 'image',
  fileName: 'a.jpg',
  createdAt: new Date('2026-10-31T10:00:00Z').toISOString(),
  ...overrides,
});

const img = () => screen.getByTestId('lightbox-image') as HTMLImageElement;
// Fire the image load event and let the opening animation finish
const loadImage = () => {
  fireEvent.load(img());
  act(() => vi.advanceTimersByTime(10));
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  toastError.mockReset();
  document.body.style.overflow = '';
});

describe('MessageBubble image', () => {
  it('opens the in-app viewer instead of a new tab', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const onImageClick = vi.fn();
    render(<MessageBubble message={imageMessage()} onImageClick={onImageClick} />);

    const button = screen.getByRole('button', { name: /view image a\.jpg/i });
    expect(button.closest('a')).toBeNull();
    expect(document.querySelector('a[target="_blank"] img')).toBeNull();

    fireEvent.click(button);
    expect(onImageClick).toHaveBeenCalledWith('m1');
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('does not render unsafe file URLs', () => {
    render(<MessageBubble message={imageMessage({ fileUrl: 'javascript:alert(1)' })} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByRole('button', { name: /view image/i })).toBeNull();
  });
});

describe('safeMediaUrl', () => {
  it('allows http(s) and same-origin paths only', () => {
    expect(safeMediaUrl('https://x.com/a.png')).toBe('https://x.com/a.png');
    expect(safeMediaUrl('/uploads/a.png')).toBe('/uploads/a.png');
    expect(safeMediaUrl('javascript:alert(1)')).toBeNull();
    expect(safeMediaUrl(' JaVaScRiPt:alert(1)')).toBeNull();
    expect(safeMediaUrl('data:image/svg+xml;base64,AAAA')).toBeNull();
    expect(safeMediaUrl('//evil.com/a.png')).toBeNull();
    expect(safeMediaUrl(undefined)).toBeNull();
  });
});

describe('ImageLightbox', () => {
  it('renders an accessible modal dialog and locks background scroll', () => {
    const { unmount } = render(<Harness />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveProperty('ariaModal', 'true');
    expect(dialog.getAttribute('aria-label')).toContain('Image 1 of 3');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /close image viewer/i }));
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('shows a loading indicator until the image loads', () => {
    render(<Harness />);
    expect(screen.getByRole('status', { name: /loading image/i })).toBeTruthy();
    loadImage();
    expect(screen.queryByRole('status', { name: /loading image/i })).toBeNull();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a click outside the image but not on the image itself', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    loadImage();

    fireEvent.click(img());
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('lightbox-stage'));
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes with the close button', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close image viewer/i }));
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a friendly error when the image fails to load', () => {
    render(<Harness />);
    fireEvent.error(img());
    expect(screen.getByRole('alert').textContent).toMatch(/couldn.t be loaded/i);
    expect((screen.getByRole('button', { name: /download image/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('zooms with the buttons, keyboard and mouse wheel', () => {
    render(<Harness />);
    loadImage();
    const zoomIn = screen.getByRole('button', { name: /^zoom in$/i });
    const zoomOut = screen.getByRole('button', { name: /^zoom out$/i }) as HTMLButtonElement;

    expect(zoomOut.disabled).toBe(true);
    fireEvent.click(zoomIn);
    expect(img().style.transform).toContain('scale(1.5)');
    expect(screen.getByText('150%')).toBeTruthy();

    fireEvent.click(zoomOut);
    expect(img().style.transform).toContain('scale(1)');

    fireEvent.keyDown(document, { key: '+' });
    expect(img().style.transform).toContain('scale(1.5)');
    fireEvent.keyDown(document, { key: '0' });
    expect(img().style.transform).toContain('scale(1)');

    fireEvent.wheel(screen.getByTestId('lightbox-stage'), { deltaY: -100 });
    expect(img().style.transform).toContain('scale(1.15)');
  });

  it('never zooms beyond the limits', () => {
    render(<Harness />);
    loadImage();
    const zoomIn = screen.getByRole('button', { name: /^zoom in$/i }) as HTMLButtonElement;
    for (let i = 0; i < 20; i++) fireEvent.click(zoomIn);
    expect(img().style.transform).toContain('scale(5)');
    expect(zoomIn.disabled).toBe(true);
  });

  it('navigates with next/previous buttons and arrow keys', () => {
    render(<Harness />);
    expect(screen.queryByRole('button', { name: /previous image/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /next image/i }));
    expect(img().getAttribute('src')).toBe(images[1].src);
    expect(screen.getByText('sunset')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(img().getAttribute('src')).toBe(images[2].src);
    expect(screen.queryByRole('button', { name: /next image/i })).toBeNull();

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(img().getAttribute('src')).toBe(images[1].src);
  });

  it('swipes between images only when not zoomed', () => {
    render(<Harness />);
    loadImage();
    const swipe = (fromX: number, toX: number) => {
      fireEvent.pointerDown(img(), { pointerId: 1, clientX: fromX, clientY: 200 });
      fireEvent.pointerMove(img(), { pointerId: 1, clientX: toX, clientY: 205 });
      fireEvent.pointerUp(img(), { pointerId: 1, clientX: toX, clientY: 205 });
    };
    swipe(300, 100);
    expect(img().getAttribute('src')).toBe(images[1].src);
    swipe(100, 300);
    expect(img().getAttribute('src')).toBe(images[0].src);
    swipe(300, 280);
    expect(img().getAttribute('src')).toBe(images[0].src);

    loadImage();
    fireEvent.click(screen.getByRole('button', { name: /^zoom in$/i }));
    swipe(300, 100);
    expect(img().getAttribute('src')).toBe(images[0].src);
  });

  it('resets zoom and shows the spinner again when switching images', () => {
    render(<Harness />);
    loadImage();
    fireEvent.click(screen.getByRole('button', { name: /^zoom in$/i }));
    fireEvent.click(screen.getByRole('button', { name: /next image/i }));
    expect(img().style.transform).toContain('scale(1)');
    expect(screen.getByRole('status', { name: /loading image/i })).toBeTruthy();
  });

  it('downloads the image as a file without opening a tab', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['x'])) });
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<Harness />);
    loadImage();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /download image/i }));
    });

    expect(fetchMock).toHaveBeenCalledWith(images[0].src);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect((clickSpy.mock.contexts[0] as HTMLAnchorElement).download).toBe('a.jpg');
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('reports a failed download', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    render(<Harness />);
    loadImage();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /download image/i }));
    });
    expect(toastError).toHaveBeenCalledWith('Could not download this image');
  });
});
