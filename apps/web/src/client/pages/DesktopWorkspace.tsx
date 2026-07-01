import { lazy, Suspense, useEffect, useState } from 'react';
import { ToastProvider } from '@desktop-toast-provider';
import { installDesktopBridge } from '../desktop/install-bridge';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuthRetry } from '../api/auth-session';

const DesktopApp = lazy(() => import('@desktop-renderer-app'));
const BROWSER_DEVICE_ID_STORAGE_KEY = 'prompthub-web-device-id';
const SKILL_STORE_STORAGE_KEY = 'skill-store';
const MAX_BROWSER_DEVICE_ID_LENGTH = 128;
const STORE_SOURCE_TYPES = new Set(['official', 'community', 'marketplace-json', 'git-repo', 'local-dir']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeSkillStoreSource(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string' ||
    !value.id.trim() ||
    typeof value.name !== 'string' ||
    !value.name.trim() ||
    typeof value.url !== 'string' ||
    !value.url.trim() ||
    typeof value.type !== 'string' ||
    !STORE_SOURCE_TYPES.has(value.type)
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    type: value.type,
    url: value.url,
    enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : 0,
    ...(typeof value.branch === 'string' ? { branch: value.branch } : {}),
    ...(typeof value.directory === 'string' ? { directory: value.directory } : {}),
    ...(typeof value.order === 'number' ? { order: value.order } : {}),
  };
}

export function restoreSyncedSkillStoreSources(snapshot: unknown): boolean {
  if (!isRecord(snapshot) || !isRecord(snapshot.storeSources)) return false;
  const skills = snapshot.storeSources.skills;
  if (!isRecord(skills) || !Array.isArray(skills.customStoreSources)) return false;
  const customStoreSources = skills.customStoreSources.map(normalizeSkillStoreSource);
  if (customStoreSources.some((source) => source === null)) return false;
  if (skills.selectedSourceId !== undefined && typeof skills.selectedSourceId !== 'string') return false;

  let envelope: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SKILL_STORE_STORAGE_KEY) ?? '{}');
    if (isRecord(parsed)) envelope = parsed;
  } catch {
    // Replace malformed browser state with the valid remote source snapshot.
  }
  const state = isRecord(envelope.state) ? envelope.state : {};
  window.localStorage.setItem(
    SKILL_STORE_STORAGE_KEY,
    JSON.stringify({
      ...envelope,
      state: {
        ...state,
        customStoreSources,
        ...(skills.selectedSourceId ? { selectedStoreSourceId: skills.selectedSourceId } : {}),
      },
    }),
  );
  return true;
}

export function restoreSyncedProjectSkillInventories(snapshot: unknown): boolean {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.projectSkillInventories)) return false;
  const projectScanState: Record<string, unknown> = {};
  for (const rawInventory of snapshot.projectSkillInventories) {
    if (!isRecord(rawInventory) || typeof rawInventory.projectId !== 'string' || !Array.isArray(rawInventory.skills)) {
      return false;
    }
    const scannedSkills = rawInventory.skills.map((rawSkill, index) => {
      if (!isRecord(rawSkill) || typeof rawSkill.name !== 'string' || !rawSkill.name.trim()) return null;
      if (rawSkill.linkedSkillId !== undefined && typeof rawSkill.linkedSkillId !== 'string') return null;
      const syntheticPath = `synced-project:${rawInventory.projectId}:${index}`;
      return {
        name: rawSkill.name,
        description: '',
        author: '',
        tags: [],
        instructions: '',
        filePath: `${syntheticPath}/SKILL.md`,
        localPath: syntheticPath,
        platforms: [],
        syncedSummaryOnly: true,
        ...(rawSkill.linkedSkillId ? { linkedSkillId: rawSkill.linkedSkillId } : {}),
      };
    });
    if (scannedSkills.some((skill) => skill === null)) return false;
    projectScanState[rawInventory.projectId] = {
      scannedSkills,
      isScanning: false,
      scannedAt: typeof rawInventory.scannedAt === 'number' ? rawInventory.scannedAt : Date.now(),
      error: null,
    };
  }

  let envelope: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SKILL_STORE_STORAGE_KEY) ?? '{}');
    if (isRecord(parsed)) envelope = parsed;
  } catch {
    // Replace malformed browser state with the valid remote inventory.
  }
  const state = isRecord(envelope.state) ? envelope.state : {};
  window.localStorage.setItem(SKILL_STORE_STORAGE_KEY, JSON.stringify({
    ...envelope,
    state: { ...state, projectScanState },
  }));
  return true;
}

function isValidBrowserDeviceId(value: string | null): value is string {
  const normalized = value?.trim();
  return Boolean(normalized && normalized.length <= MAX_BROWSER_DEVICE_ID_LENGTH);
}

function getOrCreateBrowserDeviceId(): string {
  const existing = window.localStorage.getItem(BROWSER_DEVICE_ID_STORAGE_KEY);
  if (isValidBrowserDeviceId(existing)) {
    const normalized = existing.trim();
    if (normalized !== existing) {
      window.localStorage.setItem(BROWSER_DEVICE_ID_STORAGE_KEY, normalized);
    }
    return normalized;
  }

  const nextId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `browser-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(BROWSER_DEVICE_ID_STORAGE_KEY, nextId);
  return nextId;
}

function detectClientBrowser(userAgent: string): string {
  if (/edg\//i.test(userAgent)) return 'Microsoft Edge';
  if (/chrome\//i.test(userAgent) && !/edg\//i.test(userAgent)) return 'Google Chrome';
  if (/safari\//i.test(userAgent) && !/chrome\//i.test(userAgent)) return 'Safari';
  if (/firefox\//i.test(userAgent)) return 'Firefox';
  return 'Browser';
}

function detectClientPlatform(userAgent: string): string {
  if (/mac os x/i.test(userAgent)) return 'macOS';
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/android/i.test(userAgent)) return 'Android';
  if (/(iphone|ipad|ios)/i.test(userAgent)) return 'iOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  return 'Unknown OS';
}

export function DesktopWorkspacePage() {
  const { user, registrationAllowed, isInitialized, logout } = useAuth();
  const [storeSourcesReady, setStoreSourcesReady] = useState(false);

  installDesktopBridge();

  useEffect(() => {
    let cancelled = false;

    async function hydrateStoreSources(): Promise<void> {
      try {
        const response = await fetchWithAuthRetry('/api/sync/data');
        if (!response.ok) {
          throw new Error(`Skill Store source sync failed: ${response.status}`);
        }
        const payload = (await response.json()) as { data?: unknown };
        restoreSyncedSkillStoreSources(payload.data);
        restoreSyncedProjectSkillInventories(payload.data);
      } catch (error) {
        console.warn('Failed to restore synced Skill Store sources:', error);
      } finally {
        if (!cancelled) setStoreSourcesReady(true);
      }
    }

    void hydrateStoreSources();
    return () => {
      cancelled = true;
    };
  }, [user?.username]);

  useEffect(() => {
    const heartbeat = async () => {
      if (!user?.username) {
        return;
      }

      const userAgent = navigator.userAgent;
      const response = await fetchWithAuthRetry('/api/devices/heartbeat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: getOrCreateBrowserDeviceId(),
          type: 'browser',
          name: detectClientBrowser(userAgent),
          platform: detectClientPlatform(userAgent),
          clientVersion: 'self-hosted-web',
          userAgent,
        }),
      });

      if (!response.ok) {
        throw new Error(`Device heartbeat failed: ${response.status}`);
      }
    };

    void heartbeat().catch((error) => {
      console.warn('Failed to register browser device heartbeat:', error);
    });
  }, [user?.username]);

  useEffect(() => {
    Reflect.set(window, '__PROMPTHUB_WEB_CONTEXT__', {
      mode: 'self-hosted',
      origin: window.location.origin,
      username: user?.username,
      registrationAllowed,
      initialized: isInitialized,
    });

    Reflect.set(window, '__PROMPTHUB_WEB_LOGOUT__', async () => {
      await logout();
      window.location.assign('/login');
    });

    window.dispatchEvent(new CustomEvent('prompthub:web-context-changed'));
  }, [isInitialized, logout, registrationAllowed, user?.username]);

  if (!storeSourcesReady) return null;

  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <DesktopApp />
      </Suspense>
    </ToastProvider>
  );
}
