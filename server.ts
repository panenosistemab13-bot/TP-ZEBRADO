import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Fila em memória para armazenar os blocos ZPL
  const printQueue: string[] = [];

  // API Route para adicionar impressão na fila
  app.post("/api/imprimir", async (req, res) => {
    const { zpl } = req.body;
    
    if (!zpl) {
      return res.status(400).json({ status: "erro", error: "Nenhum código ZPL fornecido." });
    }

    printQueue.push(zpl);
    console.log(`Novo lote ZPL adicionado à fila. Total pendente: ${printQueue.length}`);
    
    return res.status(200).json({ status: 'sucesso', message: 'ZPL adicionado à fila de impressão.' });
  });

  // API Route de consumo (Polling)
  app.get("/api/fila", async (req, res) => {
    if (printQueue.length > 0) {
      const zplToPrint = printQueue.shift();
      return res.status(200).json({ status: 'sucesso', zpl: zplToPrint });
    } else {
      return res.status(204).send(); // Sem conteúdo
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
