// Middleware de rota não encontrada vazio para evitar erro de importação
export function notFound(req: any, res: any, next: any) { res.status(404).json({ error: 'Rota não encontrada' }); }
