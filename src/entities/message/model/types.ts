export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface APIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
