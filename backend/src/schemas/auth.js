import { z } from 'zod';

// Login: exact { email, password }, ambele text.
// .strict() respinge orice câmp în plus (ex. "role", "isAdmin").
export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    password: z.string().min(1).max(72), // 72 = limita bcrypt
  })
  .strict();
