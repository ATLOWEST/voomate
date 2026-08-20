'use client';

export function TryNowButton() {
  return (
    <button
      type="button"
      className="try-now-btn"
      onClick={() => {
        const widget = document.querySelector('voomate-widget') as
          (HTMLElement & { open?: () => void }) | null;
        if (widget) widget.open?.();
        else {
          const btn = document.querySelector('[data-voomate-trigger]') as HTMLElement;
          btn?.click();
        }
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
      Try now
    </button>
  );
}
