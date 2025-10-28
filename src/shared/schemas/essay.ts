import { z } from 'zod';

export const createEssaySchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
  content: z.string().optional(),
  fileKey: z.string().optional(),
  fileType: z.enum(['image', 'pdf', 'docx', 'text']).optional(),
  aiProvider: z.enum(['claude', 'openai']).default('claude'),
}).refine(
  (data) => data.content || data.fileKey,
  {
    message: 'Você deve fornecer o conteúdo da redação ou enviar um arquivo',
  }
);

export const getUploadUrlSchema = z.object({
  fileName: z.string().min(1, 'Nome do arquivo é obrigatório'),
  fileType: z.string().min(1, 'Tipo do arquivo é obrigatório'),
  fileSize: z.number().positive('Tamanho do arquivo deve ser positivo'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  phoneNumber: z.string().optional(),
});

export type CreateEssayInput = z.infer<typeof createEssaySchema>;
export type GetUploadUrlInput = z.infer<typeof getUploadUrlSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
