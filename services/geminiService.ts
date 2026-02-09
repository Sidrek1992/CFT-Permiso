import { GoogleGenAI } from "@google/genai";
import { Employee, LeaveRequest } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const askHRAssistant = async (
  question: string,
  employees: Employee[],
  requests: LeaveRequest[]
): Promise<string> => {
  try {
    // Prepare context data securely
    const contextData = {
      employees: employees.map(e => ({
        name: `${e.firstName} ${e.lastName}`,
        department: e.department,
        vacationBalance: e.totalVacationDays - e.usedVacationDays,
        adminDaysBalance: e.totalAdminDays - e.usedAdminDays,
        sickDaysUsed: e.usedSickLeaveDays
      })),
      requests: requests.map(r => {
        const emp = employees.find(e => e.id === r.employeeId);
        return {
          employee: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
          type: r.type,
          dates: `${r.startDate} to ${r.endDate}`,
          status: r.status,
          reason: r.reason
        };
      })
    };

    const prompt = `
      You are an expert HR Assistant for an institution. 
      You have access to the following JSON data regarding employees and their leave requests:
      
      \`\`\`json
      ${JSON.stringify(contextData)}
      \`\`\`

      Answer the user's question based strictly on this data. 
      If you calculate balances, show your work briefly. 
      Be professional, concise, and helpful.
      If the user asks for a summary, provide a breakdown by department.
      
      User Question: ${question}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Lo siento, no pude generar una respuesta en este momento.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Ocurrió un error al consultar al asistente inteligente. Por favor verifica tu conexión o intenta más tarde.";
  }
};