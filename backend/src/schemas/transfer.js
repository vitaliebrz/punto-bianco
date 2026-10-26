import { z } from 'zod';

// Intervalul maxim cerut o dată (calendarul afișează cel mult o lună, cu zilele de la margini)
const MAX_RANGE_DAYS = 62;
const DAY_MS = 24 * 60 * 60 * 1000;

const dateTime = z.iso
  .datetime({ offset: true, message: 'Dată și oră invalide' })
  .transform((value) => new Date(value));

// Query-ul calendarului: /api/transfers?from=...&to=...
export const transfersRangeSchema = z
  .object({ from: dateTime, to: dateTime })
  .strict()
  .superRefine((range, ctx) => {
    if (range.to <= range.from) {
      ctx.addIssue({ code: 'custom', path: ['to'], message: 'Sfârșitul trebuie să fie după început' });
    } else if (range.to - range.from > MAX_RANGE_DAYS * DAY_MS) {
      ctx.addIssue({
        code: 'custom',
        path: ['to'],
        message: `Intervalul poate avea cel mult ${MAX_RANGE_DAYS} de zile`,
      });
    }
  });
