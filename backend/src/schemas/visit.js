import { z } from 'zod';
import { ApartmentType, TransferDirection } from '@prisma/client';

// Text obligatoriu: fără spații la capete, nu poate fi gol.
const requiredText = (max) =>
  z
    .string({ message: 'Câmp obligatoriu' })
    .trim()
    .min(1, 'Câmp obligatoriu')
    .max(max, `Cel mult ${max} de caractere`);

// Text opțional: lipsă, null sau gol -> null în baza de date.
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Cel mult ${max} de caractere`)
    .nullish()
    .transform((value) => value || null);

// Dată + oră cu fus orar (ex. "2026-10-28T14:30:00.000Z" sau "...+02:00") -> Date.
const dateTime = z.iso
  .datetime({ offset: true, message: 'Dată și oră invalide' })
  .transform((value) => new Date(value));

const personFields = {
  firstName: requiredText(100),
  lastName: requiredText(100),
  availability: optionalText(1000), // disponibilitatea în perioada sejurului
};

const patientSchema = z
  .object({ ...personFields, treatment: requiredText(2000) })
  .strict();

// Însoțitorul: dacă are tratament, completează aceleași câmpuri ca pacientul.
const companionSchema = z
  .object({ ...personFields, treatment: optionalText(2000) })
  .strict()
  .superRefine((companion, ctx) => {
    if (companion.availability && !companion.treatment) {
      ctx.addIssue({
        code: 'custom',
        path: ['availability'],
        message: 'Disponibilitatea se completează doar dacă însoțitorul are tratament',
      });
    }
  });

// null = nu e nevoie de cazare (nu se creează rând în Accommodation).
const accommodationSchema = z
  .object({
    apartmentType: z.enum(ApartmentType, { message: 'Tip de apartament invalid' }),
    isFree: z.boolean(),
    freeDays: z
      .number()
      .int('Număr întreg de zile')
      .min(1, 'Cel puțin o zi')
      .max(365, 'Cel mult 365 de zile')
      .nullish()
      .transform((value) => value ?? null),
  })
  .strict()
  .superRefine((accommodation, ctx) => {
    if (accommodation.isFree && accommodation.freeDays === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['freeDays'],
        message: 'Completează pentru câte zile e gratuită',
      });
    }
    if (!accommodation.isFree && accommodation.freeDays !== null) {
      ctx.addIssue({
        code: 'custom',
        path: ['freeDays'],
        message: 'Zilele gratuite se completează doar dacă cazarea e gratuită',
      });
    }
  });

// null = nu e nevoie de transfer (nu se creează rând în Transfer).
const transferSchema = z
  .object({
    isFree: z.boolean(),
    direction: z.enum(TransferDirection, { message: 'Direcție invalidă' }),
  })
  .strict();

// Formularul coordonatorului (Pasul 1 din cerință).
// .strict() peste tot: câmpuri ca createdById, backOfficeStatus sau externalId sunt respinse.
export const createVisitSchema = z
  .object({
    patient: patientSchema,
    companion: companionSchema.nullish().transform((value) => value ?? null),
    arrivalAt: dateTime,
    departureAt: dateTime,
    coordinatorId: z.number({ message: 'Alege coordonatorul' }).int().positive(),
    accommodation: accommodationSchema.nullish().transform((value) => value ?? null),
    transfer: transferSchema.nullish().transform((value) => value ?? null),
  })
  .strict()
  .superRefine((visit, ctx) => {
    if (visit.departureAt <= visit.arrivalAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['departureAt'],
        message: 'Plecarea trebuie să fie după sosire',
      });
    }
  });

// Back office: NEPRELUAT -> INCEPUT -> FINALIZAT (ordinea o verifică ruta).
export const backOfficeStatusSchema = z
  .object({ status: z.enum(['INCEPUT', 'FINALIZAT'], { message: 'Status invalid' }) })
  .strict();

// Manager cazări: NEPRELUCRAT -> REZERVAT.
export const accommodationStatusSchema = z
  .object({ status: z.literal('REZERVAT', { message: 'Status invalid' }) })
  .strict();
