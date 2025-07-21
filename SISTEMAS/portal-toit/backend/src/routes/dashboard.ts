import { Router } from 'express';
import { authenticateToken, requireAdmin, requireClient } from '../middleware/auth';

const router = Router();

// Client dashboard data
router.get('/blueworld', authenticateToken, requireClient, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      modules: [
        {
          name: 'OMS Blue World',
          url: 'https://oms.blueworld.com.br',
          status: 'active',
          description: 'Sistema de Gestão Operacional'
        }
      ],
      quickActions: [
        { name: 'Abrir Chamado', action: 'open_ticket' },
        { name: 'Relatórios', action: 'reports' },
        { name: 'Configurações', action: 'settings' }
      ],
      notifications: [],
      stats: {
        lastLogin: new Date().toISOString(),
        totalSessions: 1,
        activeTickets: 0
      }
    }
  });
});

// Admin dashboard data
router.get('/admin', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      modules: [
        {
          name: 'Portal Management',
          status: 'active',
          description: 'Gerenciar usuários e configurações'
        },
        {
          name: 'Trad.ia Platform',
          status: 'development',
          description: 'Plataforma de Trading com IA'
        },
        {
          name: 'Easis ERP',
          status: 'planned',
          description: 'Sistema ERP+CRM+Pagamentos'
        }
      ],
      systemStats: {
        totalUsers: 1,
        activeUsers: 1,
        systemLoad: '12%',
        uptime: '99.9%'
      },
      recentActivity: []
    }
  });
});

export default router;