import { EssayCorrection } from '../entities/Essay';

export interface CorrectEssayParams {
  essayText: string;
  essayTitle: string;
}

export interface IAIProvider {
  correctEssay(params: CorrectEssayParams): Promise<EssayCorrection>;
}
