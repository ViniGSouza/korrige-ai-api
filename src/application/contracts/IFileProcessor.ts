export type FileType = 'image' | 'pdf' | 'docx' | 'text';

export interface ProcessFileParams {
  fileKey: string;
  fileType: FileType;
}

export interface IFileProcessor {
  extractText(params: ProcessFileParams): Promise<string>;
}
