import { z } from 'zod';
import { Role } from '@prisma/client';
import { emailField, passwordField } from './auth.js';

// Contul nou creat de Admin. .strict(): câmpuri ca "active" sau "passwordHash" sunt respinse.
export const createUserSchema = z
  .object({
    fullName: z
      .string({ message: 'Câmp obligatoriu' })
      .trim()
      .min(1, 'Câmp obligatoriu')
      .max(100, 'Cel mult 100 de caractere'),
    email: emailField,
    role: z.enum(Role, { message: 'Alege rolul' }),
    // parola inițială, pe care Admin-ul i-o comunică colegului
    password: passwordField(8, 'Cel puțin 8 caractere'),
  })
  .strict();

// Dezactivare / reactivare
export const userActiveSchema = z.object({ active: z.boolean({ message: 'Valoare invalidă' }) }).strict();
