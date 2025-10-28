export interface SendMessageParams {
  queueUrl: string;
  messageBody: string;
  delaySeconds?: number;
}

export interface IQueueProvider {
  sendMessage(params: SendMessageParams): Promise<void>;
}
