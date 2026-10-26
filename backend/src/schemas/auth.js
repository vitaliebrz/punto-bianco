import { z } from 'zod';

// bcrypt folosește doar primii 72 de BYTES din parolă (o literă cu diacritice = 2 bytes),
// restul ar fi ignorat. De aceea limita e în bytes, nu în caractere.
const BCRYPT_MAX_BYTES = 72;

// Login: exact { email, password }, ambele text.
// .strict() respinge orice câmp în plus (ex. "role", "isAdmin").
export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    password: z
      .string()
      .min(1)
      .refine((value) => Buffer.byteLength(value, 'utf8') <= BCRYPT_MAX_BYTES, {
        message: `Parola poate avea cel mult ${BCRYPT_MAX_BYTES} de bytes`,
      }),
  })
  .strict();
