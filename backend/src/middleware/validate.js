// Verifică req.body după o schemă zod.
// - date care nu respectă schema -> 400, cererea nu ajunge la handler / bază de date
// - date corecte -> req.body e înlocuit cu varianta curățată (doar câmpurile din schemă)
//
// options.message: mesaj generic, fără detalii despre câmpuri (folosit la login).
export function validate(schema, options = {}) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      if (options.message) {
        return res.status(400).json({ error: options.message });
      }
      return res.status(400).json({
        error: 'Date invalide',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    req.body = result.data;
    next();
  };
}
