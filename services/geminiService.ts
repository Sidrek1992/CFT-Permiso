import { Employee, LeaveRequest } from "../types";
import { buildApiUrl, parseJsonSafe } from './http';

const REQUEST_TIMEOUT_MS = 15_000;

interface AskAssistantResponse {
  answer?: string;
  error?: string;
}

export const askHRAssistant = async (
  question: string,
  employees: Employee[],
  requests: LeaveRequest[],
  sessionToken: string
): Promise<string> => {
  if (!sessionToken) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión para usar el asistente IA.';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildApiUrl('/api/ai/ask'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        question,
        employees,
        requests,
      }),
    });

    const payload = await parseJsonSafe<AskAssistantResponse>(response);

    if (!response.ok) {
      if (response.status === 401) {
        return "Tu sesión expiró. Vuelve a iniciar sesión para usar el asistente IA.";
      }
      return payload?.error || "Lo siento, no pude generar una respuesta en este momento.";
    }

    return payload?.answer || "Lo siento, no pude generar una respuesta en este momento.";
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'La consulta tardó demasiado. Intenta nuevamente con una pregunta más breve.';
    }
    console.error("AI assistant request error:", error);
    return "Ocurrió un error al consultar al asistente inteligente. Por favor verifica tu conexión o intenta más tarde.";
  } finally {
    clearTimeout(timeoutId);
  }
};
