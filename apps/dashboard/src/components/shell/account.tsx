'use client';

/**
 * The organization switcher and the account menu.
 *
 * Both live in the sidebar chrome and both read the session, so they share a file. The
 * switcher is deliberately always visible rather than buried in a menu: every write in this
 * dashboard is scoped to whichever organization is selected, and an agency managing five
 * clients must be able to see which one they are editing without clicking anything.
 */
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogActions } from '@/components/ui/dialog';
import { Field, TextInput } from '@/components/ui/field';
import { useSession } from '@/lib/session';
import { api } from '@/lib/api';
import { messageFor } from '@/lib/hooks';

const initials = (value: string): string =>
  value
    .replace(/@.*$/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('') || '?';

export function OrganizationSwitcher() {
  const { organizations, organization, selectOrganization } = useSession();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useCloseOnOutsideClick(ref, () => setOpen(false));

  if (organizations.length === 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
          style={{ backgroundColor: 'var(--surface-sunken)' }}
        >
          <div className="bg-accent-100 text-accent-700 flex size-6 items-center justify-center rounded-md text-[13px] font-bold">
            +
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">Create workspace</div>
          </div>
        </button>
        {creating && <CreateOrganizationDialog onClose={() => setCreating(false)} />}
      </>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface-hover)]"
        style={{ backgroundColor: 'var(--surface-sunken)' }}
      >
        <div className="bg-accent-100 text-accent-700 flex size-6 items-center justify-center rounded-md text-[11px] font-bold">
          {initials(organization?.name ?? '?')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">
            {organization?.name ?? 'Select workspace'}
          </div>
        </div>
        <svg viewBox="0 0 20 20" fill="none" className="size-4 text-[var(--text-muted)]">
          <path
            d="m7 8 3-3 3 3M7 12l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="surface-panel absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden p-1 shadow-lg"
          role="menu"
        >
          {organizations.map((org) => (
            <button
              key={org.id}
              type="button"
              role="menuitem"
              onClick={() => {
                selectOrganization(org.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-[var(--surface-hover)]"
            >
              <span className="min-w-0 flex-1 truncate">{org.name}</span>
              <span className="text-[11px] text-muted">{org.role}</span>
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setCreating(true);
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-md border-t border-[var(--border-default)] px-2 pt-2 pb-1.5 text-left text-[13px] text-secondary transition-colors hover:bg-[var(--surface-hover)]"
          >
            + New workspace
          </button>
        </div>
      )}

      {creating && <CreateOrganizationDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function CreateOrganizationDialog({ onClose }: { onClose: () => void }) {
  const { refreshOrganizations } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');

  // Creating an organization is the one write that is *not* tenant-scoped — you cannot be a
  // member of an organization that does not exist yet — so it sends the token without an
  // `x-organization-id` header rather than going through `useApiAction`.
  const { getToken } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await api.post('/v1/organizations', { name: name.trim() }, { accessToken: await getToken() });
      await refreshOrganizations();
      // The layout fetched the org list server-side, so the server render is now stale.
      router.refresh();
      onClose();
    } catch (caught) {
      setError(messageFor(caught));
      setBusy(false);
    }
  };

  return (
    <Dialog
      title="New workspace"
      description="A workspace holds your agents, knowledge and billing. Most people need one."
      onClose={onClose}
    >
      <Field
        label="Name"
        htmlFor="org-name"
        hint="Usually your company name. You can change it later."
        error={error}
      >
        <TextInput
          id="org-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === 'Enter' && name.trim().length >= 2) void submit();
          }}
        />
      </Field>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          loading={busy}
          disabled={name.trim().length < 2}
          onClick={() => void submit()}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function AccountMenu() {
  const { email, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useCloseOnOutsideClick(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account"
        aria-expanded={open}
        className="flex size-8 items-center justify-center rounded-full text-[12px] font-semibold transition-colors hover:brightness-95"
        style={{ backgroundColor: 'var(--surface-sunken)' }}
      >
        {initials(email)}
      </button>

      {open && (
        <div
          className="surface-panel absolute top-full right-0 z-20 mt-1 w-56 p-1 shadow-lg"
          role="menu"
        >
          <div className="truncate px-2 py-1.5 text-[12px] text-muted">{email}</div>
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
            className="w-full rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-[var(--surface-hover)]"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function useCloseOnOutsideClick(ref: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [ref, close]);
}
