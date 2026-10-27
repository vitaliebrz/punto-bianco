// Verifică datele cererii după o schemă zod.
// - date care nu respectă schema -> 400, cererea nu ajunge la handler / bază de date
// - date corecte -> varianta curățată (doar câmpurile din schemă) ajunge la handler
//
// options.message: mesaj generic, fără detalii despre câmpuri (folosit la login).
// options.source: 'body' (implicit) sau 'query' (parametrii din adresă, ex. ?from=…&to=…).
//   Corp -> datele curățate înlocuiesc req.body.
//   Query -> datele curățate ajung în req.validatedQuery (în Express 5, req.query nu se poate înlocui).
export function validate(schema, options = {}) {
  const source = options.source ?? 'body';

  return (req, res, next) => {
    const result = schema.safeParse(source === 'query' ? req.query : req.body);

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

    if (source === 'query') req.validatedQuery = result.data;
    else req.body = result.data;
    next();
  };
}
