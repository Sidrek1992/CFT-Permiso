import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createSessionStore } from './sessionStore.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();

const toInt = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const normalized = Math.trunc(parsed);
  return Math.min(max, Math.max(min, normalized));
};

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;

const API_PORT = toInt(process.env.API_PORT, 4000, 1024, 65535);
const SESSION_TTL_MINUTES = toInt(process.env.SESSION_TTL_MINUTES, 480, 5, 1440);
const SESSION_TTL_MS = SESSION_TTL_MINUTES * 60 * 1000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

const AUTH_MAX_ATTEMPTS = toInt(process.env.AUTH_MAX_ATTEMPTS, 5, 1, 50);
const AUTH_WINDOW_MS = toInt(process.env.AUTH_WINDOW_MS, 10 * 60 * 1000, 10_000, 60 * 60 * 1000);
const AUTH_BLOCK_MS = toInt(process.env.AUTH_BLOCK_MS, 15 * 60 * 1000, 10_000, 24 * 60 * 60 * 1000);

const AI_RATE_LIMIT = toInt(process.env.AI_RATE_LIMIT, 30, 1, 1000);
const AI_RATE_WINDOW_MS = toInt(process.env.AI_RATE_WINDOW_MS, 60 * 1000, 1000, 60 * 60 * 1000);
const AI_TIMEOUT_MS = toInt(process.env.AI_TIMEOUT_MS, 15_000, 1000, 120_000);
const AI_MAX_QUESTION_CHARS = toInt(process.env.AI_MAX_QUESTION_CHARS, 1000, 50, 10_000);
const AI_MAX_EMPLOYEES = toInt(process.env.AI_MAX_EMPLOYEES, 300, 1, 5000);
const AI_MAX_REQUESTS = toInt(process.env.AI_MAX_REQUESTS, 1000, 1, 10_000);
const AI_MAX_FIELD_CHARS = toInt(process.env.AI_MAX_FIELD_CHARS, 120, 20, 1000);

const AUTH_PASSWORD_HASH = (process.env.AUTH_PASSWORD_HASH || '').trim().toLowerCase();

if (!SHA256_HEX_REGEX.test(AUTH_PASSWORD_HASH)) {
  throw new Error('AUTH_PASSWORD_HASH debe existir y tener formato SHA-256 hex (64 caracteres).');
}

const sessionStore = createSessionStore({
  filePath: process.env.SESSION_STORE_FILE || '.session-store.json',
});

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const allowedOrigins = new Set(
  CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const loginAttemptStore = new Map();
const aiRateStore = new Map();

app.set('trust proxy', true);

app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin no permitido por CORS'));
  },
  credentials: false,
}));

app.use(express.json({ limit: '2mb' }));

const hashPassword = (value) => crypto.createHash('sha256').update(value).digest('hex');
const newSessionToken = () => crypto.randomBytes(32).toString('hex');

const safeCompareHash = (candidateHash, expectedHash) => {
  if (!SHA256_HEX_REGEX.test(candidateHash) || !SHA256_HEX_REGEX.test(expectedHash)) {
    return false;
  }

  const candidate = Buffer.from(candidateHash, 'hex');
  const expected = Buffer.from(expectedHash, 'hex');

  if (candidate.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidate, expected);
};

const getAuthToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice('Bearer '.length).trim();
};

const getClientKey = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || 'unknown';
};

const registerFailedLogin = (clientKey) => {
  const now = Date.now();
  const current = loginAttemptStore.get(clientKey);

  if (!current || current.windowStart + AUTH_WINDOW_MS <= now) {
    loginAttemptStore.set(clientKey, {
      attempts: 1,
      windowStart: now,
      blockedUntil: null,
    });
    return;
  }

  const nextAttempts = current.attempts + 1;
  const shouldBlock = nextAttempts >= AUTH_MAX_ATTEMPTS;

  loginAttemptStore.set(clientKey, {
    attempts: shouldBlock ? 0 : nextAttempts,
    windowStart: shouldBlock ? now : current.windowStart,
    blockedUntil: shouldBlock ? now + AUTH_BLOCK_MS : null,
  });
};

const clearLoginAttempts = (clientKey) => {
  loginAttemptStore.delete(clientKey);
};

const getLoginBlockRemainingMs = (clientKey) => {
  const now = Date.now();
  const current = loginAttemptStore.get(clientKey);
  if (!current || !current.blockedUntil) {
    return 0;
  }

  if (current.blockedUntil <= now) {
    loginAttemptStore.delete(clientKey);
    return 0;
  }

  return current.blockedUntil - now;
};

const enforceAiRateLimit = (key) => {
  const now = Date.now();
  const current = aiRateStore.get(key);

  if (!current || current.windowStart + AI_RATE_WINDOW_MS <= now) {
    aiRateStore.set(key, {
      count: 1,
      windowStart: now,
    });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (current.count >= AI_RATE_LIMIT) {
    return {
      allowed: false,
      retryAfterMs: current.windowStart + AI_RATE_WINDOW_MS - now,
    };
  }

  aiRateStore.set(key, {
    count: current.count + 1,
    windowStart: current.windowStart,
  });

  return { allowed: true, retryAfterMs: 0 };
};

const sanitizeText = (value, maxLength = AI_MAX_FIELD_CHARS) => {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sanitizeEmployees = (employees) => {
  if (!Array.isArray(employees)) {
    return [];
  }

  return employees.slice(0, AI_MAX_EMPLOYEES).map((employee) => ({
    id: sanitizeText(employee.id, 64),
    firstName: sanitizeText(employee.firstName),
    lastName: sanitizeText(employee.lastName),
    department: sanitizeText(employee.department),
    position: sanitizeText(employee.position),
    totalVacationDays: toFiniteNumber(employee.totalVacationDays),
    usedVacationDays: toFiniteNumber(employee.usedVacationDays),
    totalAdminDays: toFiniteNumber(employee.totalAdminDays),
    usedAdminDays: toFiniteNumber(employee.usedAdminDays),
    totalSickLeaveDays: toFiniteNumber(employee.totalSickLeaveDays),
    usedSickLeaveDays: toFiniteNumber(employee.usedSickLeaveDays),
  }));
};

const sanitizeRequests = (requests) => {
  if (!Array.isArray(requests)) {
    return [];
  }

  return requests.slice(0, AI_MAX_REQUESTS).map((request) => ({
    id: sanitizeText(request.id, 64),
    employeeId: sanitizeText(request.employeeId, 64),
    type: sanitizeText(request.type),
    status: sanitizeText(request.status),
    startDate: sanitizeText(request.startDate, 10),
    endDate: sanitizeText(request.endDate, 10),
    reason: sanitizeText(request.reason, 240),
  }));
};

const buildAssistantPrompt = ({ question, employees, requests, employeesTruncated, requestsTruncated }) => {
  const contextData = {
    meta: {
      employeesProvided: employees.length,
      requestsProvided: requests.length,
      employeesTruncated,
      requestsTruncated,
      today: new Date().toISOString(),
    },
    employees: employees.map((employee) => ({
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      department: employee.department,
      position: employee.position,
      vacationBalance: employee.totalVacationDays - employee.usedVacationDays,
      adminDaysBalance: employee.totalAdminDays - employee.usedAdminDays,
      sickDaysUsed: employee.usedSickLeaveDays,
    })),
    requests: requests.map((request) => {
      const employee = employees.find((item) => item.id === request.employeeId);
      return {
        employee: employee ? `${employee.firstName} ${employee.lastName}` : 'Desconocido',
        type: request.type,
        status: request.status,
        dates: `${request.startDate} al ${request.endDate}`,
        reason: request.reason,
      };
    }),
  };

  return `
Eres un asistente experto de RRHH para una institución educativa.

Debes responder exclusivamente con base en estos datos JSON:

\`\`\`json
${JSON.stringify(contextData)}
\`\`\`

Reglas:
- Si faltan datos, dilo explícitamente.
- Sé conciso y profesional.
- Si calculas saldos o conteos, muestra brevemente cómo llegaste al resultado.
- Responde en español.

Pregunta del usuario:
${question}
`;
};

const requireSession = (req, res, next) => {
  const token = getAuthToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sesión requerida.' });
    return;
  }

  const session = sessionStore.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessionStore.delete(token);
    res.status(401).json({ error: 'Sesión inválida o expirada.' });
    return;
  }

  sessionStore.touch(token, Date.now() + SESSION_TTL_MS);
  req.sessionToken = token;
  next();
};

setInterval(() => {
  sessionStore.clearExpired();

  const now = Date.now();
  for (const [clientKey, data] of loginAttemptStore.entries()) {
    const expiredWindow = data.windowStart + AUTH_WINDOW_MS <= now;
    const unblockReached = data.blockedUntil && data.blockedUntil <= now;

    if (expiredWindow && !data.blockedUntil) {
      loginAttemptStore.delete(clientKey);
    } else if (unblockReached) {
      loginAttemptStore.delete(clientKey);
    }
  }

  for (const [key, data] of aiRateStore.entries()) {
    if (data.windowStart + AI_RATE_WINDOW_MS <= now) {
      aiRateStore.delete(key);
    }
  }
}, 60_000).unref();

const shutdown = () => {
  try {
    sessionStore.close();
  } catch (error) {
    console.error('Error closing session store:', error);
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', () => {
  try {
    sessionStore.flush();
  } catch {
    // no-op
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    authConfigured: true,
  });
});

app.post('/api/auth/login', (req, res) => {
  const clientKey = getClientKey(req);
  const blockedForMs = getLoginBlockRemainingMs(clientKey);
  if (blockedForMs > 0) {
    res.setHeader('Retry-After', String(Math.ceil(blockedForMs / 1000)));
    res.status(429).json({ error: 'Demasiados intentos. Intenta nuevamente más tarde.' });
    return;
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password.trim()) {
    res.status(400).json({ error: 'Debes ingresar una contraseña.' });
    return;
  }

  const candidateHash = hashPassword(password).toLowerCase();
  const valid = safeCompareHash(candidateHash, AUTH_PASSWORD_HASH);
  if (!valid) {
    registerFailedLogin(clientKey);
    res.status(401).json({ error: 'Contraseña incorrecta.' });
    return;
  }

  clearLoginAttempts(clientKey);

  const token = newSessionToken();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  sessionStore.create(token, now, expiresAt);

  res.json({ token, expiresAt });
});

app.get('/api/auth/session', requireSession, (_req, res) => {
  res.json({ valid: true });
});

app.post('/api/auth/logout', requireSession, (req, res) => {
  sessionStore.delete(req.sessionToken);
  res.json({ ok: true });
});

app.post('/api/ai/ask', requireSession, async (req, res) => {
  if (!ai) {
    res.status(503).json({ error: 'Gemini no está configurado en el servidor.' });
    return;
  }

  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!question) {
    res.status(400).json({ error: 'Debes enviar una pregunta.' });
    return;
  }

  if (question.length > AI_MAX_QUESTION_CHARS) {
    res.status(400).json({ error: `La pregunta supera el máximo permitido (${AI_MAX_QUESTION_CHARS} caracteres).` });
    return;
  }

  const rate = enforceAiRateLimit(req.sessionToken);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(Math.ceil(rate.retryAfterMs / 1000)));
    res.status(429).json({ error: 'Límite de consultas por minuto alcanzado. Intenta nuevamente en unos segundos.' });
    return;
  }

  const inputEmployees = Array.isArray(req.body?.employees) ? req.body.employees : [];
  const inputRequests = Array.isArray(req.body?.requests) ? req.body.requests : [];

  const employeesTruncated = inputEmployees.length > AI_MAX_EMPLOYEES;
  const requestsTruncated = inputRequests.length > AI_MAX_REQUESTS;

  const employees = sanitizeEmployees(inputEmployees);
  const requests = sanitizeRequests(inputRequests);

  try {
    const prompt = buildAssistantPrompt({
      question,
      employees,
      requests,
      employeesTruncated,
      requestsTruncated,
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI_TIMEOUT')), AI_TIMEOUT_MS);
    });

    const response = await Promise.race([
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      }),
      timeoutPromise,
    ]);

    res.json({
      answer: response.text || 'No pude generar una respuesta en este momento.',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'AI_TIMEOUT') {
      res.status(504).json({ error: 'El asistente tardó demasiado en responder. Intenta con una consulta más breve.' });
      return;
    }

    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Error al consultar el asistente IA.' });
  }
});

app.listen(API_PORT, () => {
  console.log(`API HR escuchando en http://localhost:${API_PORT}`);
});
