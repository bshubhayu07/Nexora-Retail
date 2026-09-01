import { apiClient } from './client';
import { CopilotChatResponseDTO } from '../types/api';

export async function sendCopilotChat(userQuery: string, useLlama = true): Promise<CopilotChatResponseDTO> {
  return apiClient<CopilotChatResponseDTO>('/copilot/chat', {
    method: 'POST',
    body: JSON.stringify({
      user_query: userQuery,
      use_llama: useLlama,
    }),
  });
}
