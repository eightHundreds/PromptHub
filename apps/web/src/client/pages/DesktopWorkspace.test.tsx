import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const { authState, fetchWithAuthRetryMock } = vi.hoisted(() => ({
  authState: {
    user: { username: 'admin' },
    registrationAllowed: false,
    isInitialized: true,
    logout: vi.fn(),
  },
  fetchWithAuthRetryMock: vi.fn(),
}));

vi.mock('@desktop-toast-provider', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@desktop-renderer-app', () => ({
  default: () => (
    <div>
      desktop app web flag: {String(Reflect.get(window, '__PROMPTHUB_WEB__'))}
    </div>
  ),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../api/auth-session', () => ({
  fetchWithAuthRetry: fetchWithAuthRetryMock,
}));

import { DesktopWorkspacePage } from './DesktopWorkspace';

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('DesktopWorkspacePage', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, '__PROMPTHUB_WEB__');
    Reflect.deleteProperty(window, '__PROMPTHUB_WEB_CONTEXT__');
    Reflect.deleteProperty(window, '__PROMPTHUB_WEB_LOGOUT__');
    Reflect.deleteProperty(window, 'api');
    Reflect.deleteProperty(window, 'electron');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createMemoryStorage(),
    });
    window.localStorage.clear();
    fetchWithAuthRetryMock.mockReset();
    fetchWithAuthRetryMock.mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('installs the web bridge before the desktop renderer first renders', async () => {
    render(<DesktopWorkspacePage />);

    expect(await screen.findByText('desktop app web flag: true')).toBeTruthy();
    expect(Reflect.get(window, 'api')).toBeTruthy();
    expect(Reflect.get(window, 'electron')).toBeTruthy();
  });

  it('self-heals invalid stored browser device ids before authenticated heartbeat', async () => {
    const invalidDeviceId = 'x'.repeat(129);
    window.localStorage.setItem('prompthub-web-device-id', invalidDeviceId);

    render(<DesktopWorkspacePage />);

    await waitFor(() => {
      expect(fetchWithAuthRetryMock).toHaveBeenCalledWith(
        '/api/devices/heartbeat',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    const heartbeatInit = fetchWithAuthRetryMock.mock.calls.find(
      ([path]) => path === '/api/devices/heartbeat',
    )?.[1] as RequestInit;
    const heartbeatBody = JSON.parse(String(heartbeatInit.body)) as { id: string };

    expect(heartbeatBody.id).not.toBe(invalidDeviceId);
    expect(heartbeatBody.id.trim()).toBe(heartbeatBody.id);
    expect(heartbeatBody.id.length).toBeGreaterThan(0);
    expect(heartbeatBody.id.length).toBeLessThanOrEqual(128);
    expect(window.localStorage.getItem('prompthub-web-device-id')).toBe(heartbeatBody.id);
    expect(fetch).not.toHaveBeenCalledWith('/api/devices/heartbeat', expect.anything());
  });

  it('hydrates synced custom Skill Store sources before rendering the desktop workspace', async () => {
    window.localStorage.setItem('skill-store', JSON.stringify({ state: { viewMode: 'list' }, version: 0 }));
    fetchWithAuthRetryMock.mockImplementation(async (path: string) => {
      if (path === '/api/sync/data') {
        return new Response(
          JSON.stringify({
            data: {
              storeSources: {
                skills: {
                  customStoreSources: [
                    {
                      id: 'custom-skills',
                      name: 'Custom Skills',
                      type: 'git-repo',
                      url: 'https://github.com/example/skills',
                      enabled: true,
                      createdAt: 1,
                    },
                  ],
                  selectedSourceId: 'custom-skills',
                },
              },
            },
          }),
          { status: 200 },
        );
      }
      return new Response('{}', { status: 200 });
    });

    render(<DesktopWorkspacePage />);

    await waitFor(() => {
      const state = JSON.parse(String(window.localStorage.getItem('skill-store'))).state;
      expect(state.selectedStoreSourceId).toBe('custom-skills');
    });
    const persisted = JSON.parse(String(window.localStorage.getItem('skill-store')));
    expect(persisted.state.viewMode).toBe('list');
    expect(persisted.state.selectedStoreSourceId).toBe('custom-skills');
    expect(persisted.state.customStoreSources).toEqual([expect.objectContaining({ id: 'custom-skills' })]);
  });

  it('keeps local Skill Store state when the remote source snapshot is malformed', async () => {
    const localState = {
      customStoreSources: [{ id: 'local-skills' }],
      selectedStoreSourceId: 'local-skills',
    };
    window.localStorage.setItem('skill-store', JSON.stringify({ state: localState, version: 0 }));
    fetchWithAuthRetryMock.mockImplementation(async (path: string) => {
      if (path === '/api/sync/data') {
        return new Response(
          JSON.stringify({
            data: {
              storeSources: {
                skills: { customStoreSources: [{ id: 'missing-fields' }] },
              },
            },
          }),
          { status: 200 },
        );
      }
      return new Response('{}', { status: 200 });
    });

    render(<DesktopWorkspacePage />);

    await waitFor(() => {
      expect(fetchWithAuthRetryMock).toHaveBeenCalledWith('/api/sync/data');
    });
    await screen.findByText(/desktop app web flag:/);
    const persisted = JSON.parse(String(window.localStorage.getItem('skill-store')));
    expect(persisted.state).toEqual(localState);
  });

  it('loads the workspace with existing local sources when remote hydration fails', async () => {
    const localState = {
      customStoreSources: [{ id: 'local-skills' }],
      selectedStoreSourceId: 'local-skills',
    };
    window.localStorage.setItem('skill-store', JSON.stringify({ state: localState, version: 0 }));
    fetchWithAuthRetryMock.mockRejectedValueOnce(new Error('network unavailable'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(<DesktopWorkspacePage />);

    await screen.findByText(/desktop app web flag:/);
    const persisted = JSON.parse(String(window.localStorage.getItem('skill-store')));
    expect(persisted.state).toEqual(localState);
  });
});
