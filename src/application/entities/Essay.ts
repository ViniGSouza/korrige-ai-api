export interface Essay {
  PK: string; // USER#${userId}
  SK: string; // ESSAY#${essayId}
  GSI1PK: string; // ESSAY#STATUS#${status}
  GSI1SK: string; // ESSAY#${createdAt}
  GSI2PK: string; // ESSAY#USER#${userId}
  GSI2SK: string; // ESSAY#${createdAt}
  essayId: string;
  userId: string;
  title: string;
  content?: string; // Texto da redação (se enviado como texto)
  fileKey?: string; // Chave do arquivo no S3 (se enviado como arquivo)
  fileType?: 'image' | 'pdf' | 'docx' | 'text';
  status: EssayStatus;
  extractedText?: string; // Texto extraído do arquivo
  correction?: EssayCorrection;
  aiProvider?: 'claude' | 'openai';
  createdAt: string;
  updatedAt: string;
  type: 'ESSAY';
  [key: string]: unknown; // Index signature para compatibilidade com Record<string, unknown>
}

export type EssayStatus =
  | 'pending' // Aguardando processamento
  | 'processing' // Em processamento
  | 'completed' // Correção concluída
  | 'failed'; // Falha no processamento

export interface EssayCorrection {
  competency1: CompetencyScore; // Domínio da escrita formal
  competency2: CompetencyScore; // Compreender e desenvolver o tema
  competency3: CompetencyScore; // Organizar e relacionar informações
  competency4: CompetencyScore; // Conhecimento dos mecanismos linguísticos
  competency5: CompetencyScore; // Proposta de intervenção
  totalScore: number; // Soma das 5 competências (0-1000)
  overallFeedback: string; // Feedback geral da redação
  processedAt: string;
  processingTimeMs: number;
}

export interface CompetencyScore {
  score: number; // 0-200
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface CreateEssayDTO {
  userId: string;
  title: string;
  content?: string;
  fileKey?: string;
  fileType?: 'image' | 'pdf' | 'docx' | 'text';
  aiProvider?: 'claude' | 'openai';
}

export interface UpdateEssayDTO {
  status?: EssayStatus;
  extractedText?: string;
  correction?: EssayCorrection;
}

export interface SQSEssayMessage {
  essayId: string;
  userId: string;
  aiProvider: 'claude' | 'openai';
}
