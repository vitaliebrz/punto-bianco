import { z } from 'zod';

// bcrypt folosește doar primii 72 de BYTES din parolă (o literă cu diacritice = 2 bytes),
// restul ar fi ignorat. De aceea limita e în bytes, nu în caractere.
const BCRYPT_MAX_BYTES = 72;

// Email: fără spații la capete, cu litere mici (așa e salvat în bază), maxim 254 de caractere.
// Folosit la login și la crearea unui cont (schemas/user.js).
export const emailField = z.string().trim().toLowerCase().pipe(z.email('Email invalid').max(254));

// Parolă de cel mult 72 de bytes (limita bcrypt), cu cel puțin `min` caractere
export const passwordField = (min, minMessage) =>
  z
    .string({ message: 'Câmp obligatoriu' })
    .min(min, minMessage)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= BCRYPT_MAX_BYTES, {
      message: `Parola poate avea cel mult ${BCRYPT_MAX_BYTES} de bytes`,
    });

// Login: exact { email, password }, ambele text.
// .strict() respinge orice câmp în plus (ex. "role", "isAdmin").
export const loginSchema = z
  .object({
    email: emailField,
    password: passwordField(1),
  })
  .strict();
