import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_FLUSH_INTERVAL_MS = 5000;

const resolveStorePath = (filePath) => {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(process.cwd(), filePath);
};

const readStoreFile = (absolutePath) => {
  if (!fs.existsSync(absolutePath)) {
    return new Map();
  }

  try {
    const raw = fs.readFileSync(absolutePath, 'utf8');
    if (!raw.trim()) {
      return new Map();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.sessions)) {
      return new Map();
    }

    const map = new Map();
    parsed.sessions.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }

      const token = typeof entry.token === 'string' ? entry.token : '';
      const createdAt = Number(entry.createdAt);
      const expiresAt = Number(entry.expiresAt);

      if (!token || !Number.isFinite(createdAt) || !Number.isFinite(expiresAt)) {
        return;
      }

      map.set(token, { createdAt, expiresAt });
    });

    return map;
  } catch {
    return new Map();
  }
};

const writeStoreFile = (absolutePath, sessionsMap) => {
  const parentDir = path.dirname(absolutePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  const tmpPath = `${absolutePath}.tmp`;
  const payload = {
    sessions: Array.from(sessionsMap.entries()).map(([token, session]) => ({
      token,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    })),
  };

  fs.writeFileSync(tmpPath, JSON.stringify(payload), 'utf8');
  fs.renameSync(tmpPath, absolutePath);
};

export const createSessionStore = ({
  filePath,
  flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS,
} = {}) => {
  const absolutePath = resolveStorePath(filePath || '.session-store.json');
  const sessions = readStoreFile(absolutePath);
  let dirty = false;

  const persist = () => {
    if (!dirty) {
      return;
    }

    writeStoreFile(absolutePath, sessions);
    dirty = false;
  };

  const markDirty = () => {
    dirty = true;
  };

  const flushTimer = setInterval(() => {
    try {
      persist();
    } catch (error) {
      console.error('Session store flush error:', error);
    }
  }, flushIntervalMs);
  flushTimer.unref();

  const clearExpired = (now = Date.now()) => {
    let removed = 0;
    for (const [token, session] of sessions.entries()) {
      if (session.expiresAt <= now) {
        sessions.delete(token);
        removed += 1;
      }
    }

    if (removed > 0) {
      markDirty();
    }

    return removed;
  };

  clearExpired();

  return {
    create(token, createdAt, expiresAt) {
      sessions.set(token, { createdAt, expiresAt });
      markDirty();
    },
    get(token) {
      return sessions.get(token) || null;
    },
    touch(token, expiresAt) {
      const current = sessions.get(token);
      if (!current) {
        return false;
      }

      sessions.set(token, {
        ...current,
        expiresAt,
      });
      markDirty();
      return true;
    },
    delete(token) {
      const deleted = sessions.delete(token);
      if (deleted) {
        markDirty();
      }
      return deleted;
    },
    clearExpired,
    flush() {
      persist();
    },
    close() {
      clearInterval(flushTimer);
      persist();
    },
  };
};
