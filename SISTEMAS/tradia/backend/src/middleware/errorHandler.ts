// Middleware de tratamento de erro vazio para evitar erro de importação
export function errorHandler(err: any, req: any, res: any, next: any) { res.status(500).json({ error: 'Erro interno' }); }
