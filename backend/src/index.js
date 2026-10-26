import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Verificare rapidă că serverul rulează (folosit și de Render pentru health check)
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API Punto Bianco pornit pe http://localhost:${PORT}`);
});
