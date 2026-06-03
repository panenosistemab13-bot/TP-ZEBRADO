// Fila em memória para armazenar os blocos ZPL no ambiente do servidor Vercel
const printQueue = [];

export default function handler(req, res) {
  // Configuração dos cabeçalhos de CORS básicos
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Trata requisições OPTIONS (Preflight Check)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verifica o método HTTP
  if (req.method === 'POST') {
    const { zpl } = req.body || {};
    
    if (!zpl) {
      return res.status(400).json({ status: "erro", error: "Nenhum código ZPL fornecido." });
    }

    printQueue.push(zpl);
    console.log(`[Vercel Serverless] Novo lote ZPL adicionado à fila. Total pendente: ${printQueue.length}`);
    
    return res.status(200).json({ status: 'sucesso', message: 'ZPL adicionado à fila de impressão.' });
  }

  if (req.method === 'GET') {
    if (printQueue.length > 0) {
      const zplToPrint = printQueue.shift();
      console.log(`[Vercel Serverless] ZPL consumido da fila. Itens restantes: ${printQueue.length}`);
      return res.status(200).json({ status: 'sucesso', zpl: zplToPrint });
    } else {
      return res.status(204).end(); // Sem conteúdo (204 No Content)
    }
  }

  // Método não aceito
  return res.status(405).json({ status: "erro", error: "Método não permitido" });
}
