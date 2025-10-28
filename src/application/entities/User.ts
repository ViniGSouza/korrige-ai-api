export interface User {
  PK: string; // USER#${userId}
  SK: string; // USER#${userId}
  GSI1PK: string; // USER#EMAIL#${email}
  GSI1SK: string; // USER#EMAIL#${email}
  userId: string;
  email: string;
  name: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
  type: 'USER';
  [key: string]: unknown; // Index signature para compatibilidade com Record<string, unknown>
}

export interface CreateUserDTO {
  email: string;
  name: string;
  phoneNumber?: string;
}

export interface UpdateUserDTO {
  name?: string;
  phoneNumber?: string;
}
