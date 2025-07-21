// ...existing code...
// ******** INITIAL CONSTANTS ********

require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const multer = require('multer');
const puppeteer = require('puppeteer');
const { google } = require('googleapis');
const sharp = require('sharp');
const nodemailer = require('nodemailer');
const { gerarRelatorioParaOS } = require('./gerar-relatorio-os13-perfeito');
const { gerarTemplateEmailBlueWorld } = require('./email-template-blueworld');

// ******** APP ********

const app = express();
// Endpoint para métricas globais
const prisma = new PrismaClient({
  errorFormat: 'pretty',
  log: ['error', 'warn'],
});
const PORT = process.env.PORT || 8080;

// ******** CORS CORRIGIDO ********

app.use(cors({
  origin: ["https://blueworld.up.railway.app"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json());

// Middleware para disponibilizar prisma nas requisições
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// ******** CONFIGURAÇÃO UPLOAD GOOGLE DRIVE ********

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'), false);
    }
  }
});

// ******** FUNÇÕES UTILITÁRIAS ********

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token ausente' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token ausente' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}

// ✅ FUNÇÃO CORRIGIDA - buscarContasGDrive()
async function buscarContasGDrive() {
  try {
    console.log('🔍 Buscando contas Google Drive ativas...');
    
    const contas = await prisma.ConfiguracaoSistema.findMany({
      where: { chave: { startsWith: 'gdrive_conta_' } },
      orderBy: { chave: 'asc' }
    });

    console.log(`📋 Encontradas ${contas.length} contas no banco:`, contas.map(c => c.chave));

    const contasAtivas = contas
      .map(conta => {
        console.log(`🔍 Analisando conta: ${conta.chave}`);
        
        try {
          // ✅ CORRIGIDO: Parse do objeto completo primeiro
          const config = JSON.parse(conta.valor);
          
          // ✅ CORRIGIDO: Extrair service account do config
          const serviceAccount = config.service_account_key;
          
          if (!serviceAccount) {
            console.log(`❌ Conta ${conta.chave} - service_account_key não encontrado no config`);
            return null;
          }
          
          console.log(`   Project ID: ${serviceAccount.project_id}`);
          console.log(`   Client Email: ${serviceAccount.client_email}`);
          console.log(`   Folder ID: ${config.folder_id || conta.descricao}`);
          console.log(`   Status: ${config.status || 'N/A'}`);
          
          if (serviceAccount.type === 'service_account' && serviceAccount.private_key) {
            // ✅ Extrair número da ordem da chave (gdrive_conta_1 → 1)
            const ordem = config.ordem || parseInt(conta.chave.replace('gdrive_conta_', '')) || 999;
            
            console.log(`✅ Conta ${conta.chave} VÁLIDA - Ordem: ${ordem}`);
            return { 
              service_account_key: serviceAccount, // ✅ Service account correto
              chave: conta.chave,
              folder_id: config.folder_id || conta.descricao, // ✅ Folder ID do config ou fallback
              ordem: ordem,
              status: config.status || 'ATIVA'
            };
          } else {
            console.log(`❌ Conta ${conta.chave} REJEITADA - Não é service account válido`);
          }
        } catch (e) {
          console.error(`❌ Erro ao parsear conta ${conta.chave}:`, e.message);
        }
        return null;
      })
      .filter(Boolean)
      .filter(conta => !['CHEIA', 'INVALIDA'].includes(conta.status)) // ✅ CORRIGIDO: Filtrar contas cheias e inválidas
      .sort((a, b) => a.ordem - b.ordem); // ✅ Sempre conta_1 primeiro

    console.log(`📊 RESULTADO: ${contasAtivas.length} contas ativas válidas`);
    console.log(`📋 Ordem das contas:`, contasAtivas.map(c => `${c.chave}(${c.ordem})`));
    
    if (contasAtivas.length === 0) {
      console.error('❌ PROBLEMA: Nenhuma conta válida encontrada!');
    }
    
    return contasAtivas;
  } catch (error) {
    console.error('❌ Erro ao buscar contas Google Drive:', error);
    return [];
  }
}

// ✅ CORRIGIDO: Função para upload no Google Drive com fallback
async function uploadToGoogleDrive(file, contaConfig) {
  try {
    console.log(`📤 Tentando upload na conta: ${contaConfig.chave}`);
    
    // ✅ CORRIGIDO: Criar credentials corretamente com escape de caracteres
    let credentials = contaConfig.service_account_key;
    
    // Corrigir escape de caracteres na private key se necessário
    if (credentials.private_key && typeof credentials.private_key === 'string') {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    
    // ✅ NOVO: Usar JWT para Domain-Wide Delegation se configurado
    let auth;
    if (contaConfig.delegated_user_email) {
      // Domain-Wide Delegation
      const jwtClient = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/drive.file'],
        contaConfig.delegated_user_email
      );
      auth = jwtClient;
    } else {
      // Service Account padrão
      auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });
    }

    const drive = google.drive({ version: 'v3', auth });

    // ✅ CORRIGIDO: Usar stream corretamente
    const { Readable } = require('stream');
    const bufferStream = new Readable({
      read() {}
    });
    bufferStream.push(file.buffer);
    bufferStream.push(null);

    const response = await drive.files.create({
      requestBody: {
        name: `instalacao_${Date.now()}_${file.originalname}`,
        parents: [contaConfig.folder_id]
      },
      media: {
        mimeType: file.mimetype,
        body: bufferStream
      }
    });

    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    const url = `https://drive.google.com/uc?id=${response.data.id}`;
    console.log(`✅ Upload bem-sucedido: ${url}`);
    return url;
  } catch (error) {
    console.error(`❌ Erro no upload da conta ${contaConfig.chave}:`, error.message);
    
    // ✅ CORRIGIDO: Marcar conta como CHEIA se quota exceder
    if (error.message.includes('quota') || error.message.includes('storage')) {
      try {
        // ✅ CORRIGIDO: Buscar config atual e atualizar status
        const contaAtual = await prisma.ConfiguracaoSistema.findUnique({
          where: { chave: contaConfig.chave }
        });
        
        if (contaAtual) {
          const configAtual = JSON.parse(contaAtual.valor);
          configAtual.status = 'CHEIA';
          
          await prisma.ConfiguracaoSistema.update({
            where: { chave: contaConfig.chave },
            data: { valor: JSON.stringify(configAtual) }
          });
          console.log(`⚠️ Conta ${contaConfig.chave} marcada como CHEIA`);
        }
      } catch (updateError) {
        console.error('❌ Erro ao marcar conta como cheia:', updateError);
      }
    }
    
    throw error;
  }
}

// Função para buscar configuração do sistema
async function getConfiguracaoSistema(chave) {
  try {
    const config = await prisma.ConfiguracaoSistema.findUnique({
      where: { chave }
    });
    
    if (config) {
      console.log(`✅ Configuração ${chave} encontrada: ${config.valor}`);
      return config.valor;
    }
    
    console.log(`⚠️ Configuração ${chave} não encontrada na tabela`);
    return null;
    
  } catch (error) {
    console.error(`❌ Erro ao buscar configuração ${chave}:`, error);
    return null;
  }
}

// ******** ✅ RELATÓRIO HTML ÉPICO BLUEWORLD ********

// Função para buscar configurações de cálculo
async function buscarConfiguracoesCalculo() {
  try {
    const configs = await prisma.ConfiguracaoSistema.findMany({
      where: {
        chave: {
          in: [
            'calculo_multiplicador_pontos',
            'calculo_fluxo_medio_dispensado',
            'calculo_decimais_relatorio',
            'horario_comercial_inicio',
            'horario_comercial_fim',
            'metricas_dias_calculo_global'
          ]
        }
      }
    });

    const configObj = {};
    configs.forEach(config => {
      configObj[config.chave] = config.valor;
    });

    // Valores padrão caso não existam no banco
    return {
      multiplicadorPontos: parseFloat(configObj.calculo_multiplicador_pontos) || 1.8,
      fluxoMedioDispensado: parseFloat(configObj.calculo_fluxo_medio_dispensado) || 4.0,
      decimaisRelatorio: parseInt(configObj.calculo_decimais_relatorio) || 1
    };
  } catch (error) {
    console.error('❌ Erro ao buscar configurações de cálculo:', error);
    // Retornar valores padrão em caso de erro
    return {
      multiplicadorPontos: 1.8,
      fluxoMedioDispensado: 4.0,
      decimaisRelatorio: 1,
      horarioComercialInicio: 8,
      horarioComercialFim: 18,
      metricasDiasCalculoGlobal: 60
    };
  }
}

// Função para buscar configurações da empresa
async function buscarConfiguracoesEmpresa() {
  try {
    const configs = await prisma.ConfiguracaoSistema.findMany({
      where: {
        chave: {
          in: [
            'empresa_nome',
            'empresa_descricao', 
            'empresa_slogan',
            'empresa_icone',
            'empresa_texto_excelencia',
            'empresa_texto_documento'
          ]
        }
      }
    });

    const configObj = {};
    configs.forEach(config => {
      configObj[config.chave] = config.valor;
    });

    // Valores padrão caso não existam no banco
    return {
      nome: configObj.empresa_nome || 'BlueWorld',
      descricao: configObj.empresa_descricao || 'Tecnologia em Economia de Água',
      slogan: configObj.empresa_slogan || 'Tecnologia sustentável para um futuro melhor',
      icone: configObj.empresa_icone || '💧',
      textoExcelencia: configObj.empresa_texto_excelencia || 'Projeto executado com excelência técnica',
      textoDocumento: configObj.empresa_texto_documento || 'Este é um documento oficial da instalação realizada'
    };
  } catch (error) {
    console.error('❌ Erro ao buscar configurações da empresa:', error);
    // Retornar valores padrão em caso de erro
    return {
      nome: 'BlueWorld',
      descricao: 'Tecnologia em Economia de Água', 
      slogan: 'Tecnologia sustentável para um futuro melhor',
      icone: '💧',
      textoExcelencia: 'Projeto executado com excelência técnica',
      textoDocumento: 'Este é um documento oficial da instalação realizada'
    };
  }
}

async function gerarRelatorioHTML(os, instalacoes) {
  try {
    console.log(`📊 Gerando relatório HTML para OS#${os.id} com ${instalacoes.length} instalações`);
    
    // Buscar configurações da empresa e cálculo
    const empresa = await buscarConfiguracoesEmpresa();
    const calculo = await buscarConfiguracoesCalculo();
    
    console.log(`✅ Configurações carregadas - Empresa: ${empresa.nome}, Decimais: ${calculo.decimaisRelatorio}`);
  
  // Processar dados das instalações
  const processarDadosInstalacoes = (instalacoes) => {
    const instalacoesProcessadas = [];
    const equipamentos = { embolos: {}, molas: {} };
    
    instalacoes.forEach(inst => {
      try {
        const dados = typeof inst.dadosInstalacao === 'string' 
          ? JSON.parse(inst.dadosInstalacao) 
          : inst.dadosInstalacao || {};
        
        // ✅ CORREÇÃO: Buscar dados dos campos específicos da tabela instalação
        const instalacao = {
          local: inst.localSelecionado?.replace(/_/g, ' ') || 'Local não especificado',
          embolo: inst.emboloSelecionado || dados.emboloSelecionado || dados.embolo || 'Não especificado',
          mola: inst.molaSelecionada || dados.molaSelecionada || dados.mola || 'Não especificado',
          fluxoAntes: parseFloat(inst.fluxoAntes || dados.fluxoAntes || 0),
          fluxoDepois: parseFloat(inst.fluxoDepois || dados.fluxoDepois || 0),
          reducao: 0,
          fotos: []
        };
        
        // Calcular redução
        if (instalacao.fluxoAntes > 0) {
          instalacao.reducao = ((instalacao.fluxoAntes - instalacao.fluxoDepois) / instalacao.fluxoAntes * 100);
        }
        
        // ✅ CORREÇÃO: Processar fotos dos campos específicos da tabela com labels corretos
        const tiposFotos = [
          { campo: 'fotoAntesLink', dadosCampo: 'foto1Link', tipo: 'Local (Antes)' },
          { campo: 'fotoFluxoAntesLink', dadosCampo: 'fotoFluxoAntesLink', tipo: 'Fluxo (Antes)' },
          { campo: 'fotoFluxoDepoisLink', dadosCampo: 'fotoFluxoDepoisLink', tipo: 'Fluxo (Depois)' },
          { campo: 'fotoLacreLink', dadosCampo: 'fotoLacreLink', tipo: 'Lacre' },
          { campo: 'fotoDepoisLink', dadosCampo: 'fotoDepoisLink', tipo: 'Local (Depois)' }
        ];
        
        tiposFotos.forEach(({ campo, dadosCampo, tipo }) => {
          const fotoUrl = inst[campo] || dados[dadosCampo] || dados[campo];
          if (fotoUrl) {
            instalacao.fotos.push({ tipo, url: fotoUrl });
          }
        });
        
        instalacoesProcessadas.push(instalacao);
        
        // Contar equipamentos
        if (instalacao.embolo && instalacao.embolo !== 'Não especificado') {
          equipamentos.embolos[instalacao.embolo] = (equipamentos.embolos[instalacao.embolo] || 0) + 1;
        }
        if (instalacao.mola && instalacao.mola !== 'Não especificado') {
          equipamentos.molas[instalacao.mola] = (equipamentos.molas[instalacao.mola] || 0) + 1;
        }
        
      } catch (error) {
        console.error('❌ Erro ao processar instalação:', error);
        console.error('Instalação que causou erro:', inst);
      }
    });
    
    return { instalacoesProcessadas, equipamentos };
  };
  
  const { instalacoesProcessadas, equipamentos } = processarDadosInstalacoes(instalacoes);
  
  // Função para calcular métricas
  const calcularMetricas = () => {
    const totalValvulas = instalacoesProcessadas.length;
    const fluxoAntesTotal = instalacoesProcessadas.reduce((sum, inst) => sum + inst.fluxoAntes, 0);
    const fluxoDepoisTotal = instalacoesProcessadas.reduce((sum, inst) => sum + inst.fluxoDepois, 0);
    const economiaTotal = fluxoAntesTotal - fluxoDepoisTotal;
    const reducaoMedia = totalValvulas > 0 ? (economiaTotal / fluxoAntesTotal) * 100 : 0;
    const economiaMediaPorValvula = totalValvulas > 0 ? economiaTotal / totalValvulas : 0;
    
    // Contagem de locais únicos
    const locaisUnicos = new Set(instalacoesProcessadas.map(inst => inst.local));
    const locaisAnalisados = locaisUnicos.size;
    
    // Pontos dispensados (simulado)
    const pontosDispensados = Math.floor(totalValvulas * 0.15);
    const pontosAnalisados = totalValvulas + pontosDispensados;
    
    // Motivos de não efetivação (simulado baseado nos dados)
    const motivosNaoEfetivadas = {
      'Fluxo já otimizado': Math.floor(pontosDispensados * 0.6),
      'Estrutura inadequada': Math.floor(pontosDispensados * 0.4)
    };
    
    // Calcular local com maior eficiência
    let localMaiorEficiencia = { local: 'N/A', reducao: 0 };
    if (instalacoesProcessadas.length > 0) {
      const instalacaoMaiorReducao = instalacoesProcessadas.reduce((max, inst) => {
        const reducaoAtual = inst.fluxoAntes > 0 ? ((inst.fluxoAntes - inst.fluxoDepois) / inst.fluxoAntes) * 100 : 0;
        const reducaoMax = max.fluxoAntes > 0 ? ((max.fluxoAntes - max.fluxoDepois) / max.fluxoAntes) * 100 : 0;
        return reducaoAtual > reducaoMax ? inst : max;
      });
      localMaiorEficiencia = {
        local: instalacaoMaiorReducao.local || 'Local não informado',
        reducao: instalacaoMaiorReducao.fluxoAntes > 0 ? ((instalacaoMaiorReducao.fluxoAntes - instalacaoMaiorReducao.fluxoDepois) / instalacaoMaiorReducao.fluxoAntes) * 100 : 0
      };
    }
    
    return {
      totalValvulas,
      fluxoAntesTotal: fluxoAntesTotal.toFixed(calculo.decimaisRelatorio),
      fluxoDepoisTotal: fluxoDepoisTotal.toFixed(calculo.decimaisRelatorio),
      economiaTotal: economiaTotal.toFixed(calculo.decimaisRelatorio),
      reducaoMedia: reducaoMedia.toFixed(calculo.decimaisRelatorio),
      economiaMediaPorValvula: economiaMediaPorValvula.toFixed(calculo.decimaisRelatorio),
      locaisAnalisados,
      pontosAnalisados,
      pontosDispensados,
      motivosNaoEfetivadas,
      localMaiorEficiencia
    };
  };
  
  const metricas = calcularMetricas();
  
  console.log(`✅ Relatório HTML gerado com sucesso - ${metricas.totalValvulas} válvulas, ${metricas.locaisAnalisados} locais`);

  // Criar HTML do relatório - usando exatamente o template fornecido
  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Instalação - ${empresa.nome}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #1e293b; 
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            overflow-x: hidden;
        }
        
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            border-radius: 20px;
            overflow: hidden;
        }
        
        /* Header Épico */
        .header { 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%); 
            color: white; 
            padding: 60px 40px; 
            text-align: center; 
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: repeating-linear-gradient(
                45deg,
                transparent,
                transparent 2px,
                rgba(255,255,255,0.1) 2px,
                rgba(255,255,255,0.1) 4px
            );
            animation: slide 20s linear infinite;
        }
        
        @keyframes slide { 0% { transform: translateX(-50%) translateY(-50%) rotate(0deg); } 100% { transform: translateX(-50%) translateY(-50%) rotate(360deg); } }
        
        .header-content { position: relative; z-index: 2; }
        
        .logo { 
            font-size: 42px; 
            font-weight: 900; 
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            animation: fadeInUp 1s ease-out;
        }
        
        .subtitle { 
            font-size: 24px; 
            margin-bottom: 15px; 
            opacity: 0.95;
            animation: fadeInUp 1s ease-out 0.2s both;
        }
        
        .client-info { 
            font-size: 18px; 
            opacity: 0.9;
            animation: fadeInUp 1s ease-out 0.4s both;
        }
        
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        
        /* Dashboard Principal */
        .dashboard { 
            padding: 60px 40px; 
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }
        
        .section-title { 
            font-size: 32px; 
            font-weight: 700; 
            color: #1e40af; 
            text-align: center; 
            margin-bottom: 40px;
            position: relative;
        }
        
        .section-title::after {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 80px;
            height: 4px;
            background: linear-gradient(90deg, #3b82f6, #60a5fa);
            border-radius: 2px;
        }
        
        /* Métricas Principais */
        .metrics-hero { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
            gap: 20px; 
            margin-bottom: 60px;
        }
        
        .metric-card { 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); 
            color: white; 
            padding: 25px 20px; 
            border-radius: 15px; 
            text-align: center;
            box-shadow: 0 15px 20px -5px rgba(59, 130, 246, 0.4);
            transform: translateY(0);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 30px -5px rgba(59, 130, 246, 0.6);
        }
        
        .metric-card:hover::before { left: 100%; }
        
        .metric-value { 
            font-size: 28px; 
            font-weight: 900; 
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .metric-label { 
            font-size: 14px; 
            opacity: 0.95;
            font-weight: 500;
        }
        
        /* Estatísticas Detalhadas */
        .stats-section { 
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); 
            padding: 40px 25px; 
            border-radius: 15px; 
            margin-bottom: 30px;
        }
        
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px;
        }
        
        .stat-item { 
            background: white; 
            padding: 20px; 
            border-radius: 12px; 
            box-shadow: 0 8px 10px -3px rgba(0, 0, 0, 0.1);
            border-left: 4px solid #3b82f6;
            transition: all 0.3s ease;
        }
        
        .stat-item:hover {
            transform: translateX(3px);
            box-shadow: 0 15px 20px -5px rgba(0, 0, 0, 0.15);
        }
        
        .stat-title { 
            font-size: 12px; 
            color: #64748b; 
            margin-bottom: 6px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stat-value { 
            font-size: 22px; 
            font-weight: 700; 
            color: #1e40af;
        }
        
        /* Resumo Técnico */
        .technical-summary {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 10px -3px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 25px;
        }
        
        .summary-card {
            padding: 25px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 12px;
            border: 2px solid #e2e8f0;
            transition: all 0.3s ease;
        }
        
        .summary-card:hover {
            border-color: #3b82f6;
            transform: translateY(-3px);
        }
        
        .summary-title {
            font-size: 16px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .equipment-list {
            list-style: none;
            padding: 0;
        }
        
        .equipment-list li {
            padding: 6px 0;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .equipment-list li:last-child { border-bottom: none; }
        
        /* Seção de Detalhes */
        .details-section {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 10px -3px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }
        
        .details-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            flex-wrap: wrap;
            gap: 15px;
        }
        
        .filters {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .filter-btn {
            padding: 8px 16px;
            border: 2px solid #3b82f6;
            background: white;
            color: #3b82f6;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 12px;
            font-weight: 600;
        }
        
        .filter-btn:hover, .filter-btn.active {
            background: #3b82f6;
            color: white;
        }
        
        .installation-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .installation-card {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s ease;
        }
        
        .installation-card:hover {
            border-color: #3b82f6;
            transform: translateY(-2px);
        }
        
        .installation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .installation-title {
            font-size: 16px;
            font-weight: 700;
            color: #1e40af;
        }
        
        .reduction-badge {
            background: #10b981;
            color: white;
            padding: 4px 8px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .installation-metrics {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .metric-item {
            text-align: center;
            padding: 10px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .metric-item-value {
            font-size: 18px;
            font-weight: 700;
            color: #1e40af;
        }
        
        .metric-item-label {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
        }
        
        .equipment-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .equipment-item {
            background: white;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 12px;
        }
        
        .equipment-label {
            color: #64748b;
            font-weight: 600;
        }
        
        .equipment-value {
            color: #1e40af;
            font-weight: 700;
        }
        
        .photos-section {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .photos-title {
            font-size: 14px;
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 10px;
        }
        
        .photos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 10px;
        }
        
        .photo-item {
            text-align: center;
        }
        
        .photo-link {
            text-decoration: none;
            display: block;
        }
        
        .photo-placeholder {
            width: 100%;
            height: 80px;
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            border-radius: 12px;
            border: 2px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .photo-placeholder:hover {
            border-color: #3b82f6;
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            transform: translateY(-2px);
        }
        
        .photo-icon {
            font-size: 16px;
            margin-bottom: 2px;
        }
        
        .photo-label {
            font-size: 10px;
            color: #64748b;
            font-weight: 500;
        }
        
        .photo-hint {
            font-size: 8px;
            color: #94a3b8;
            margin-top: 1px;
        }
        
        /* Footer */
        .footer {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .footer-content {
            max-width: 600px;
            margin: 0 auto;
        }
        
        .footer h3 {
            font-size: 24px;
            margin-bottom: 15px;
        }
        
        .footer p {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 10px;
        }
        
        .footer-date {
            font-size: 14px;
            opacity: 0.8;
            margin-top: 20px;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .container { margin: 10px; border-radius: 10px; }
            .header { padding: 40px 20px; }
            .dashboard { padding: 40px 20px; }
            .metrics-hero { grid-template-columns: 1fr; }
            .stats-grid { grid-template-columns: 1fr; }
            .summary-grid { grid-template-columns: 1fr; }
            .installation-grid { grid-template-columns: 1fr; }
            .details-header { flex-direction: column; align-items: stretch; }
            .filters { justify-content: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header Épico -->
        <div class="header">
            <div class="header-content">
                <div class="logo">${empresa.icone || '🌊'} ${empresa.nome || 'BlueWorld'}</div>
                <div class="subtitle">${empresa.slogan || 'Tecnologia em Economia de Água'}</div>
                <div class="client-info">
                    <strong>Ordem de Serviço #${os.id}</strong><br>
                    Cliente: ${os.cliente || 'Não informado'}<br>
                    Data: ${new Date().toLocaleDateString('pt-BR')}
                </div>
            </div>
        </div>
        
        <!-- Dashboard Principal -->
        <div class="dashboard">
            <div class="section-title">📊 Dashboard de Resultados</div>
            
            <!-- Métricas Principais -->
            <div class="metrics-hero">
                <div class="metric-card">
                    <div class="metric-value">${metricas.totalValvulas}</div>
                    <div class="metric-label">Válvulas Instaladas</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${metricas.locaisAnalisados}</div>
                    <div class="metric-label">Locais Analisados</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${metricas.pontosAnalisados}</div>
                    <div class="metric-label">Pontos Analisados</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${metricas.reducaoMedia}%</div>
                    <div class="metric-label">Redução Média</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${metricas.economiaTotal}</div>
                    <div class="metric-label">Economia Total (L/min)</div>
                </div>
            </div>
            
            <!-- Estatísticas Detalhadas -->
            <div class="stats-section">
                <div class="section-title" style="font-size: 24px; margin-bottom: 30px;">📈 Estatísticas Detalhadas</div>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-title">Fluxo Total Antes</div>
                        <div class="stat-value">${metricas.fluxoAntesTotal} L/min</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-title">Fluxo Total Depois</div>
                        <div class="stat-value">${metricas.fluxoDepoisTotal} L/min</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-title">Economia Média/Válvula</div>
                        <div class="stat-value">${metricas.economiaMediaPorValvula} L/min</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-title">Pontos Dispensados</div>
                        <div class="stat-value">${metricas.pontosDispensados}</div>
                    </div>
                </div>
            </div>
            
            <!-- Resumo Técnico -->
            <div class="technical-summary">
                <div class="section-title" style="font-size: 24px; margin-bottom: 30px;">⚙️ Resumo Técnico</div>
                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="summary-title">🔧 Êmbolos Utilizados</div>
                        <ul class="equipment-list">
                            ${Object.entries(equipamentos.embolos).map(([embolo, quantidade]) => 
                              `<li><span>${embolo}</span><span><strong>${quantidade}x</strong></span></li>`
                            ).join('') || '<li><span>Nenhum êmbolo registrado</span></li>'}
                        </ul>
                    </div>
                    <div class="summary-card">
                        <div class="summary-title">⚡ Molas Utilizadas</div>
                        <ul class="equipment-list">
                            ${Object.entries(equipamentos.molas).map(([mola, quantidade]) => 
                              `<li><span>${mola}</span><span><strong>${quantidade}x</strong></span></li>`
                            ).join('') || '<li><span>Nenhuma mola registrada</span></li>'}
                        </ul>
                    </div>
                    <div class="summary-card">
                        <div class="summary-title">❌ Motivos Não Efetivação</div>
                        <ul class="equipment-list">
                            ${Object.entries(metricas.motivosNaoEfetivadas).map(([motivo, quantidade]) => 
                              `<li><span>${motivo}</span><span><strong>${quantidade}</strong></span></li>`
                            ).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- Detalhes das Instalações -->
            <div class="details-section">
                <div class="details-header">
                    <div class="section-title" style="font-size: 24px; margin-bottom: 0;">🏠 Detalhes das Instalações</div>
                    <div class="filters">
                        <button class="filter-btn active" onclick="filterInstallations('all')">Todas</button>
                        <button class="filter-btn" onclick="filterInstallations('high')">Alta Redução (>20%)</button>
                        <button class="filter-btn" onclick="filterInstallations('medium')">Média Redução (10-20%)</button>
                        <button class="filter-btn" onclick="filterInstallations('low')">Baixa Redução (<10%)</button>
                    </div>
                </div>
                
                <div class="installation-grid">
                    ${instalacoesProcessadas.map((inst, index) => `
                        <div class="installation-card" data-reduction="${inst.reducao}">
                            <div class="installation-header">
                                <div class="installation-title">📍 ${inst.local}</div>
                                <div class="reduction-badge">${inst.reducao.toFixed(1)}%</div>
                            </div>
                            
                            <div class="installation-metrics">
                                <div class="metric-item">
                                    <div class="metric-item-value">${inst.fluxoAntes.toFixed(calculo.decimaisRelatorio)}</div>
                                    <div class="metric-item-label">Fluxo Antes (L/min)</div>
                                </div>
                                <div class="metric-item">
                                    <div class="metric-item-value">${inst.fluxoDepois.toFixed(calculo.decimaisRelatorio)}</div>
                                    <div class="metric-item-label">Fluxo Depois (L/min)</div>
                                </div>
                            </div>
                            
                            <div class="equipment-info">
                                <div class="equipment-item">
                                    <div class="equipment-label">Êmbolo:</div>
                                    <div class="equipment-value">${inst.embolo}</div>
                                </div>
                                <div class="equipment-item">
                                    <div class="equipment-label">Mola:</div>
                                    <div class="equipment-value">${inst.mola}</div>
                                </div>
                            </div>
                            
                            ${inst.fotos.length > 0 ? `
                                <div class="photos-section">
                                    <div class="photos-title">📸 Fotos da Instalação</div>
                                    <div class="photos-grid">
                                        ${inst.fotos.map(foto => `
                                            <div class="photo-item">
                                                <a href="${foto.url}" target="_blank" class="photo-link">
                                                    <div class="photo-placeholder">
                                                        <span class="photo-icon">📸</span>
                                                        <div class="photo-label">${foto.tipo}</div>
                                                        <div class="photo-hint">Clique para visualizar</div>
                                                    </div>
                                                </a>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-content">
                <h3>✅ Instalação Concluída</h3>
                <p>${empresa.texto_excelencia || 'Excelência em soluções de economia de água'}</p>
                <p><strong>${empresa.texto_documento || 'Documento gerado automaticamente pelo sistema OMS'}</strong></p>
                <div class="footer-date">
                    Relatório gerado em ${new Date().toLocaleString('pt-BR')}
                </div>
            </div>
        </div>
    </div>
    
    <script>
        function filterInstallations(type) {
            const cards = document.querySelectorAll('.installation-card');
            const buttons = document.querySelectorAll('.filter-btn');
            
            // Remove active class from all buttons
            buttons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            event.target.classList.add('active');
            
            cards.forEach(card => {
                const reduction = parseFloat(card.dataset.reduction);
                let show = true;
                
                switch(type) {
                    case 'high':
                        show = reduction > 20;
                        break;
                    case 'medium':
                        show = reduction >= 10 && reduction <= 20;
                        break;
                    case 'low':
                        show = reduction < 10;
                        break;
                    default:
                        show = true;
                }
                
                card.style.display = show ? 'block' : 'none';
            });
        }
    </script>
</body>
</html>`;
    
    return htmlContent;
    
  } catch (error) {
    console.error('❌ Erro ao gerar relatório HTML:', error);
    return `<html><body><h1>Erro ao gerar relatório</h1><p>${error.message}</p></body></html>`;
  }
}

// ✅ FUNÇÃO AUXILIAR - Corrigida para buscar configurações da empresa
async function buscarConfiguracoesEmpresa() {
  try {
    const configuracoes = await prisma.ConfiguracaoSistema.findMany({
      where: {
        chave: {
          startsWith: 'empresa_'
        }
      }
    });
    
    const empresa = {
      nome: 'BlueWorld',
      slogan: 'Tecnologia em Economia de Água',
      icone: '🌊',
      texto_excelencia: 'Excelência em soluções de economia de água',
      texto_documento: 'Documento gerado automaticamente pelo sistema OMS'
    };
    
    configuracoes.forEach(config => {
      if (config.chave === 'empresa_nome') empresa.nome = config.valor;
      if (config.chave === 'empresa_slogan') empresa.slogan = config.valor;
      if (config.chave === 'empresa_icone') empresa.icone = config.valor;
      if (config.chave === 'empresa_texto_excelencia') empresa.texto_excelencia = config.valor;
      if (config.chave === 'empresa_texto_documento') empresa.texto_documento = config.valor;
    });
    
    return empresa;
  } catch (error) {
    console.error('❌ Erro ao buscar configurações da empresa:', error);
    return {
      nome: 'BlueWorld',
      slogan: 'Tecnologia em Economia de Água',
      icone: '🌊',
      texto_excelencia: 'Excelência em soluções de economia de água',
      texto_documento: 'Documento gerado automaticamente pelo sistema OMS'
    };
  }
}

// ✅ FUNÇÃO AUXILIAR - Corrigida para buscar configurações de cálculo
async function buscarConfiguracoesCalculo() {
  try {
    const configuracoes = await prisma.ConfiguracaoSistema.findMany({
      where: {
        chave: {
          in: ['calculo_decimais_relatorio', 'horario_comercial_inicio', 'horario_comercial_fim']
        }
      }
    });
    
    const calculo = {
      decimaisRelatorio: 1,
      horarioComercialInicio: 8,
      horarioComercialFim: 18
    };
    
    configuracoes.forEach(config => {
      if (config.chave === 'calculo_decimais_relatorio') calculo.decimaisRelatorio = parseInt(config.valor) || 1;
      if (config.chave === 'horario_comercial_inicio') calculo.horarioComercialInicio = parseInt(config.valor) || 8;
      if (config.chave === 'horario_comercial_fim') calculo.horarioComercialFim = parseInt(config.valor) || 18;
    });
    
    return calculo;
  } catch (error) {
    console.error('❌ Erro ao buscar configurações de cálculo:', error);
    return {
      decimaisRelatorio: 1,
      horarioComercialInicio: 8,
      horarioComercialFim: 18
    };
  }
}

// ✅ FUNÇÃO CORRIGIDA - Envio email com OAuth2 ao invés de Service Account
async function enviarEmailGmail(destinatario, assunto, htmlContent) {
  try {
    console.log(`📧 Tentando enviar email para ${destinatario}...`);
    
    // Buscar configurações OAuth2
    const contaEmail = await prisma.configuracaoSistema.findFirst({
      where: { chave: 'email_padrao' }
    });
    
    if (!contaEmail) {
      throw new Error('❌ Configuração email_padrao não encontrada');
    }
    
    // Determinar qual conta usar (prioritário: conta específica ou fallback para conta 1)
    let contaOAuth = null;
    
    if (contaEmail.valor === 'conta_1') {
      contaOAuth = await prisma.configuracaoSistema.findFirst({
        where: { chave: 'oauth_tokens_conta_1' }
      });
    } else if (contaEmail.valor === 'conta_2') {
      contaOAuth = await prisma.configuracaoSistema.findFirst({
        where: { chave: 'oauth_tokens_conta_2' }
      });
    }
    
    if (!contaOAuth) {
      console.log('⚠️ Tentando fallback para conta 1...');
      contaOAuth = await prisma.configuracaoSistema.findFirst({
        where: { chave: 'oauth_tokens_conta_1' }
      });
    }
    
    if (!contaOAuth) {
      throw new Error('❌ Nenhuma conta OAuth2 configurada para envio de emails');
    }
    
    const tokens = JSON.parse(contaOAuth.valor);
    console.log(`✅ Usando conta OAuth2: ${contaOAuth.chave}`);
    
    // Buscar configurações da conta
    const configConta = await prisma.configuracaoSistema.findFirst({
      where: { chave: contaOAuth.chave.replace('oauth_tokens_', '') }
    });
    
    if (!configConta) {
      throw new Error(`❌ Configuração da conta não encontrada: ${contaOAuth.chave}`);
    }
    
    const configData = JSON.parse(configConta.valor);
    
    // Configurar OAuth2
    const oauth2Client = new google.auth.OAuth2(
      configData.client_id,
      configData.client_secret,
      "https://oms-blue-world-backend.up.railway.app/auth/callback"
    );
    
    oauth2Client.setCredentials(tokens);
    
    // Configurar Gmail API
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Criar mensagem
    const mensagem = [
      'To: ' + destinatario,
      'Subject: =?UTF-8?B?' + Buffer.from(assunto).toString('base64') + '?=',
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlContent
    ].join('\n');
    
    const mensagemCodificada = Buffer.from(mensagem).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Enviar email
    console.log(`📤 Enviando email via Gmail API...`);
    const resultado = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: mensagemCodificada
      }
    });
    
    console.log(`✅ Email enviado com sucesso! ID: ${resultado.data.id}`);
    return { success: true, messageId: resultado.data.id };
    
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    throw error;
  }
}

// ✅ FUNÇÃO AUXILIAR - Salvar configuração no banco
async function salvarConfiguracao(chave, valor, tipo = 'string', descricao = '') {
  try {
    await prisma.configuracaoSistema.upsert({
      where: { chave },
      update: { valor, tipo, descricao },
      create: { chave, valor, tipo, descricao }
    });
    console.log(`✅ Configuração salva: ${chave} = ${valor}`);
  } catch (error) {
    console.error(`❌ Erro ao salvar configuração ${chave}:`, error);
  }
}

// ✅ FUNÇÃO AUXILIAR - Buscar configuração do banco
async function buscarConfiguracao(chave, valorPadrao = null) {
  try {
    const config = await prisma.configuracaoSistema.findFirst({
      where: { chave }
    });
    return config ? config.valor : valorPadrao;
  } catch (error) {
    console.error(`❌ Erro ao buscar configuração ${chave}:`, error);
    return valorPadrao;
  }
}

// ✅ FUNÇÃO DE UPLOAD - Corrigida para usar OAuth2 de forma híbrida
async function uploadParaGoogleDrive(buffer, nomeArquivo, mimeType) {
  try {
    console.log(`📤 Iniciando upload para Google Drive: ${nomeArquivo}`);
    
    // Buscar contas OAuth2 ativas
    const contasOAuth = await prisma.ConfiguracaoSistema.findMany({
      where: { chave: { startsWith: 'oauth_tokens_conta_' } },
      orderBy: { chave: 'asc' }
    });
    
    console.log(`🔍 Encontradas ${contasOAuth.length} contas OAuth2`);
    
    for (const contaOAuth of contasOAuth) {
      try {
        console.log(`⚡ Tentando upload com ${contaOAuth.chave}...`);
        
        const tokens = JSON.parse(contaOAuth.valor);
        
        // Buscar configurações da conta
        const configConta = await prisma.configuracaoSistema.findFirst({
          where: { chave: contaOAuth.chave.replace('oauth_tokens_', '') }
        });
        
        if (!configConta) {
          console.log(`❌ Configuração da conta não encontrada: ${contaOAuth.chave}`);
          continue;
        }
        
        const configData = JSON.parse(configConta.valor);
        
        // Configurar OAuth2
        const oauth2Client = new google.auth.OAuth2(
          configData.client_id,
          configData.client_secret,
          "https://oms-blue-world-backend.up.railway.app/auth/callback"
        );
        
        oauth2Client.setCredentials(tokens);
        
        // Configurar Google Drive API
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        
        // Fazer upload
        const response = await drive.files.create({
          requestBody: {
            name: nomeArquivo,
            parents: [configData.folder_id]
          },
          media: {
            mimeType: mimeType,
            body: buffer
          }
        });
        
        const fileId = response.data.id;
        
        // Tornar arquivo público
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });
        
        const publicUrl = `https://drive.google.com/uc?id=${fileId}`;
        console.log(`✅ Upload realizado com sucesso: ${publicUrl}`);
        
        return { success: true, url: publicUrl, fileId: fileId };
        
      } catch (error) {
        console.error(`❌ Erro com conta ${contaOAuth.chave}:`, error.message);
        continue;
      }
    }
    
    throw new Error('❌ Todas as contas OAuth2 falharam no upload');
    
  } catch (error) {
    console.error('❌ Erro geral no upload:', error);
    throw error;
  }
}

// ✅ ENDPOINT - Finalizar instalação (corrigido para usar campos específicos)
app.post('/api/instalacoes/finalizar/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { observacaoFinal } = req.body;
    
    console.log(`🔄 Finalizando instalação ${id}...`);
    
    // Buscar instalação
    const instalacao = await prisma.instalacao.findUnique({
      where: { id: parseInt(id) },
      include: {
        ordemServico: true
      }
    });
    
    if (!instalacao) {
      return res.status(404).json({ error: 'Instalação não encontrada' });
    }
    
    // Atualizar instalação
    await prisma.instalacao.update({
      where: { id: parseInt(id) },
      data: {
        status: 'CONCLUIDA',
        dadosInstalacao: observacaoFinal || 'Instalação finalizada',
        dataHoraFim: new Date(),
        dataHoraObservacao: new Date()
      }
    });
    
    // Atualizar status da OS
    await prisma.ordemservico.update({
      where: { id: instalacao.ordemServicoId },
      data: { status: 'INSTALADA' }
    });
    
    console.log(`✅ Instalação ${id} finalizada com sucesso`);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Erro ao finalizar instalação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint duplicado removido - usando versão atualizada nas linhas 3621+
/*
app.patch('/api/ordens-servico/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, emailsExtras, motivoRejeicao } = req.body;
    
    console.log(`🔄 Alterando status da OS ${id} para ${status}...`);
    
    // Buscar OS
    const ordem = await prisma.ordemservico.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!ordem) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }
    
    // Atualizar status e motivo da rejeição se necessário
    let updateData = { status };
    if (status === 'REJEITADA' && motivoRejeicao) {
      updateData.observacao = motivoRejeicao;
    }
    await prisma.ordemservico.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    
    // ✅ NOTIFICAÇÃO DE REJEIÇÃO - Apenas para quem criou a OS
    if (status === 'REJEITADA') {
      try {
        // Buscar OS atualizada
        const ordem = await prisma.ordemservico.findUnique({ where: { id: parseInt(id) } });
        // Criar notificação para criador
        await prisma.notificacao.create({
          data: {
            titulo: `Ordem de Serviço Rejeitada`,
            mensagem: `Sua OS foi rejeitada. Motivo: ${motivoRejeicao}`,
            tipo: 'OS_REJEITADA',
            destinatarioId: ordem.criadorId,
            dadosExtras: {
              osId: ordem.id,
              motivo: motivoRejeicao,
              cliente: ordem.cliente,
              responsavel: ordem.responsavel,
              telefone: ordem.telefone,
              cidade: ordem.enderecoCidade,
              equipe: ordem.equipeVinculo
            }
          }
        });
        console.log('✅ Notificação de rejeição criada para criador');
      } catch (error) {
        console.error('❌ Erro ao criar notificação de rejeição:', error);
      }
    }
    // Se mudou para CONCLUIDA, enviar email
    if (status === 'CONCLUIDA') {
      try {
        console.log(`📧 Gerando e enviando email para OS ${id}...`);
        
        // Buscar instalações da OS
        const instalacoes = await prisma.instalacao.findMany({
          where: { ordemServicoId: parseInt(id) }
        });
        
        if (instalacoes.length === 0) {
          console.log(`⚠️ Nenhuma instalação encontrada para OS ${id}`);
          return res.json({ success: true, message: 'Status atualizado, mas nenhuma instalação encontrada para email' });
        }
        
        // Gerar relatório HTML
        const relatorio = await gerarRelatorioHTML(ordem, instalacoes);
        
        // Buscar emails padrão
        const destPadrao = await buscarConfiguracao('dest_padrao', '');
        const emailsPadrao = destPadrao ? destPadrao.split(',').map(email => email.trim()) : [];
        
        // Combinar emails
        const emailsExtrasArray = emailsExtras ? emailsExtras.split(',').map(email => email.trim()) : [];
        const todosEmails = [...emailsPadrao, ordem.cliente, ...emailsExtrasArray]
          .filter(email => email && email.includes('@'))
          .filter((email, index, array) => array.indexOf(email) === index); // Remover duplicados
        
        if (todosEmails.length === 0) {
          console.log(`⚠️ Nenhum email válido encontrado para OS ${id}`);
          return res.json({ success: true, message: 'Status atualizado, mas nenhum email válido encontrado' });
        }
        
        // Enviar email para cada destinatário
        const resultados = [];
        for (const email of todosEmails) {
          try {
            const resultado = await enviarEmailGmail(
              email,
              `✅ Instalação Concluída - OS #${ordem.id}`,
              relatorio
            );
            resultados.push({ email, success: true });
          } catch (error) {
            console.error(`❌ Falha ao enviar email para ${email}:`, error);
            resultados.push({ email, success: false, error: error.message });
          }
        }
        
        const sucessos = resultados.filter(r => r.success).length;
        const falhas = resultados.filter(r => !r.success).length;
        
        console.log(`📧 Resultado do envio: ${sucessos} sucessos, ${falhas} falhas`);
        
        res.json({
          success: true,
          message: `Status atualizado. Emails enviados: ${sucessos}/${todosEmails.length}`,
          emailResults: resultados
        });
        
      } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        res.json({
          success: true,
          message: 'Status atualizado, mas erro ao enviar email',
          error: error.message
        });
      }
    } else {
      res.json({ success: true, message: 'Status atualizado com sucesso' });
    }
    
  } catch (error) {
    console.error('❌ Erro ao alterar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
*/


// Função para gerar relatório HTML épico
async function gerarRelatorioHTML(os, instalacoes) {
  try {
    console.log(`📊 Gerando relatório HTML para OS#${os.id} com ${instalacoes.length} instalações`);
    
    // Buscar configurações da empresa e cálculo
    const empresa = await buscarConfiguracoesEmpresa();
    const calculo = await buscarConfiguracoesCalculo();
    
    console.log(`✅ Configurações carregadas - Empresa: ${empresa.nome}, Decimais: ${calculo.decimaisRelatorio}`);
  
  // Processar dados das instalações
  const processarDadosInstalacoes = (instalacoes) => {
    const instalacoesProcessadas = [];
    const equipamentos = { embolos: {}, molas: {} };
    
    instalacoes.forEach(inst => {
      try {
        const dados = typeof inst.dadosInstalacao === 'string' 
          ? JSON.parse(inst.dadosInstalacao) 
          : inst.dadosInstalacao || {};
        
        // ✅ CORREÇÃO: Buscar dados dos campos específicos da tabela instalação
        const instalacao = {
          local: inst.localSelecionado?.replace(/_/g, ' ') || 'Local não especificado',
          embolo: inst.emboloSelecionado || dados.emboloSelecionado || dados.embolo || 'Não especificado',
          mola: inst.molaSelecionada || dados.molaSelecionada || dados.mola || 'Não especificado',
          fluxoAntes: parseFloat(inst.fluxoAntes || dados.fluxoAntes || 0),
          fluxoDepois: parseFloat(inst.fluxoDepois || dados.fluxoDepois || 0),
          reducao: 0,
          fotos: []
        };
        
        // Calcular redução
        if (instalacao.fluxoAntes > 0) {
          instalacao.reducao = ((instalacao.fluxoAntes - instalacao.fluxoDepois) / instalacao.fluxoAntes * 100);
        }
        
        // ✅ CORREÇÃO: Processar fotos dos campos específicos da tabela com labels corretos
        const tiposFotos = [
          { campo: 'fotoAntesLink', dadosCampo: 'foto1Link', tipo: 'Local (Antes)' },
          { campo: 'fotoFluxoAntesLink', dadosCampo: 'fotoFluxoAntesLink', tipo: 'Fluxo (Antes)' },
          { campo: 'fotoFluxoDepoisLink', dadosCampo: 'fotoFluxoDepoisLink', tipo: 'Fluxo (Depois)' },
          { campo: 'fotoLacreLink', dadosCampo: 'fotoLacreLink', tipo: 'Lacre' },
          { campo: 'fotoDepoisLink', dadosCampo: 'fotoDepoisLink', tipo: 'Local (Depois)' }
        ];
        
        tiposFotos.forEach(({ campo, dadosCampo, tipo }) => {
          const fotoUrl = inst[campo] || dados[dadosCampo] || dados[campo];
          if (fotoUrl) {
            instalacao.fotos.push({ tipo, url: fotoUrl });
          }
        });
        
        instalacoesProcessadas.push(instalacao);
        
        // Contar equipamentos
        if (instalacao.embolo && instalacao.embolo !== 'Não especificado') {
          equipamentos.embolos[instalacao.embolo] = (equipamentos.embolos[instalacao.embolo] || 0) + 1;
        }
        if (instalacao.mola && instalacao.mola !== 'Não especificado') {
          equipamentos.molas[instalacao.mola] = (equipamentos.molas[instalacao.mola] || 0) + 1;
        }
        
      } catch (error) {
        console.error('❌ Erro ao processar instalação:', error);
        console.error('Instalação que causou erro:', inst);
      }
    });
    
    return { instalacoesProcessadas, equipamentos };
  };
  
  const { instalacoesProcessadas, equipamentos } = processarDadosInstalacoes(instalacoes);
  
  // Função para calcular métricas
  const calcularMetricas = () => {
    const totalValvulas = instalacoesProcessadas.length;
    const fluxoAntesTotal = instalacoesProcessadas.reduce((sum, inst) => sum + inst.fluxoAntes, 0);
    const fluxoDepoisTotal = instalacoesProcessadas.reduce((sum, inst) => sum + inst.fluxoDepois, 0);
    const economiaTotal = fluxoAntesTotal - fluxoDepoisTotal;
    const reducaoMedia = totalValvulas > 0 ? (economiaTotal / fluxoAntesTotal) * 100 : 0;
    const economiaMediaPorValvula = totalValvulas > 0 ? economiaTotal / totalValvulas : 0;
    
    // Contagem de locais únicos
    const locaisUnicos = new Set(instalacoesProcessadas.map(inst => inst.local));
    const locaisAnalisados = locaisUnicos.size;
    
    // Pontos dispensados (simulado)
    const pontosDispensados = Math.floor(totalValvulas * 0.15);
    const pontosAnalisados = totalValvulas + pontosDispensados;
    
    // Motivos de não efetivação (simulado baseado nos dados)
    const motivosNaoEfetivadas = {
      'Fluxo já otimizado': Math.floor(pontosDispensados * 0.6),
      'Estrutura inadequada': Math.floor(pontosDispensados * 0.4)
    };
    
    // Calcular local com maior eficiência
    let localMaiorEficiencia = { local: 'N/A', reducao: 0 };
    if (instalacoesProcessadas.length > 0) {
      const instalacaoMaiorReducao = instalacoesProcessadas.reduce((max, inst) => {
        const reducaoAtual = inst.fluxoAntes > 0 ? ((inst.fluxoAntes - inst.fluxoDepois) / inst.fluxoAntes) * 100 : 0;
        const reducaoMax = max.fluxoAntes > 0 ? ((max.fluxoAntes - max.fluxoDepois) / max.fluxoAntes) * 100 : 0;
        return reducaoAtual > reducaoMax ? inst : max;
      });
      localMaiorEficiencia = {
        local: instalacaoMaiorReducao.local || 'Local não informado',
        reducao: instalacaoMaiorReducao.fluxoAntes > 0 ? ((instalacaoMaiorReducao.fluxoAntes - instalacaoMaiorReducao.fluxoDepois) / instalacaoMaiorReducao.fluxoAntes) * 100 : 0
      };
    }
    
    return {
      totalValvulas,
      fluxoAntesTotal: fluxoAntesTotal.toFixed(calculo.decimaisRelatorio),
      fluxoDepoisTotal: fluxoDepoisTotal.toFixed(calculo.decimaisRelatorio),
      economiaTotal: economiaTotal.toFixed(calculo.decimaisRelatorio),
      reducaoMedia: reducaoMedia.toFixed(calculo.decimaisRelatorio),
      economiaMediaPorValvula: economiaMediaPorValvula.toFixed(calculo.decimaisRelatorio),
      pontosAnalisados,
      pontosDispensados,
      locaisAnalisados,
      motivosNaoEfetivadas,
      localMaiorEficiencia
    };
  };
  
  const metricas = calcularMetricas();
  
  console.log(`✅ Relatório HTML gerado com sucesso - ${metricas.totalValvulas} válvulas, ${metricas.locaisAnalisados} locais`);

  // Criar HTML como anexo com navegação funcional
  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Instalação - ${empresa.nome} - OS #${os.id}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.5; 
            color: #0f172a; 
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            overflow-x: hidden;
            font-size: 14px;
            margin: 0;
            padding: 0;
        }
        
        .container { 
            max-width: 1000px; 
            margin: 20px auto; 
            background: white; 
            box-shadow: 
                0 25px 50px -12px rgba(0, 0, 0, 0.15),
                0 0 0 1px rgba(255, 255, 255, 0.05);
            border-radius: 24px;
            overflow: hidden;
            position: relative;
        }
        
        .container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.02) 0%, rgba(30, 64, 175, 0.02) 100%);
            pointer-events: none;
        }
        
        /* Header Épico */
        .header { 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%); 
            color: white; 
            padding: 60px 40px; 
            text-align: center; 
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: repeating-linear-gradient(
                45deg,
                transparent,
                transparent 2px,
                rgba(255,255,255,0.1) 2px,
                rgba(255,255,255,0.1) 4px
            );
            animation: slide 20s linear infinite;
        }
        
        @keyframes slide { 0% { transform: translateX(-50%) translateY(-50%) rotate(0deg); } 100% { transform: translateX(-50%) translateY(-50%) rotate(360deg); } }
        
        .header-content { position: relative; z-index: 2; }
        
        .logo { 
            font-size: 42px; 
            font-weight: 900; 
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            animation: fadeInUp 1s ease-out;
        }
        
        .subtitle { 
            font-size: 24px; 
            margin-bottom: 15px; 
            opacity: 0.95;
            animation: fadeInUp 1s ease-out 0.2s both;
        }
        
        .client-info { 
            font-size: 18px; 
            opacity: 0.9;
            animation: fadeInUp 1s ease-out 0.4s both;
        }
        
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        
        /* Dashboard Principal */
        .dashboard { 
            padding: 60px 40px; 
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }
        
        .section-title { 
            font-size: 32px; 
            font-weight: 700; 
            color: #1e40af; 
            text-align: center; 
            margin-bottom: 40px;
            position: relative;
        }
        
        .section-title::after {
            content: '';
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 80px;
            height: 4px;
            background: linear-gradient(90deg, #3b82f6, #60a5fa);
            border-radius: 2px;
        }
        
        /* Métricas Principais */
        .metrics-hero { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
            gap: 30px; 
            margin-bottom: 60px;
        }
        
        .metric-card { 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); 
            color: white; 
            padding: 32px 24px; 
            border-radius: 20px; 
            text-align: center;
            box-shadow: 
                0 10px 25px -5px rgba(59, 130, 246, 0.25),
                0 0 0 1px rgba(255, 255, 255, 0.1);
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(10px);
        }
        
        .metric-card::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
        }
        
        .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
        }
        
        .metric-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 25px 50px -12px rgba(59, 130, 246, 0.6);
        }
        
        .metric-card:hover::before { left: 100%; }
        
        .metric-value { 
            font-size: 48px; 
            font-weight: 900; 
            margin-bottom: 15px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .metric-label { 
            font-size: 16px; 
            opacity: 0.95;
            font-weight: 500;
        }
        
        /* Estatísticas Detalhadas */
        .stats-section { 
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); 
            padding: 50px 30px; 
            border-radius: 20px; 
            margin-bottom: 40px;
        }
        
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 25px;
        }
        
        .stat-item { 
            background: white; 
            padding: 25px; 
            border-radius: 15px; 
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            border-left: 5px solid #3b82f6;
            transition: all 0.3s ease;
            text-align: center;
        }
        
        .stat-item:hover {
            transform: translateX(5px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
        }
        
        .stat-title { 
            font-size: 14px; 
            color: #64748b; 
            margin-bottom: 8px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stat-value { 
            font-size: 28px; 
            font-weight: 700; 
            color: #1e40af;
            text-align: center;
        }
        
        /* Resumo Técnico */
        .technical-summary {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            margin-bottom: 40px;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }
        
        .summary-card {
            padding: 30px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 15px;
            border: 2px solid #e2e8f0;
            transition: all 0.3s ease;
        }
        
        .summary-card:hover {
            border-color: #3b82f6;
            transform: translateY(-5px);
        }
        
        .summary-title {
            font-size: 18px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .equipment-list {
            list-style: none;
            padding: 0;
        }
        
        .equipment-list li {
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
        }
        
        .equipment-list li:last-child { border-bottom: none; }
        
        /* Navegação */
        .navigation {
            padding: 40px;
            text-align: center;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
        }
        
        .nav-button {
            display: inline-block;
            background: white;
            color: #1e40af;
            padding: 18px 40px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 700;
            font-size: 18px;
            transition: all 0.3s ease;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
            border: 3px solid transparent;
        }
        
        .nav-button:hover {
            background: #1e40af;
            color: white;
            transform: translateY(-3px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
            border-color: white;
        }
        
        /* Página de Detalhes */
        .details-page { display: none; }
        
        .details-grid {
            display: grid;
            gap: 30px;
            padding: 40px;
        }
        
        .installation-card {
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 15px 25px -5px rgba(0, 0, 0, 0.1);
            border: 2px solid #f1f5f9;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .installation-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: linear-gradient(90deg, #1e40af, #3b82f6, #60a5fa);
        }
        
        .installation-card:hover {
            border-color: #3b82f6;
            transform: translateY(-8px);
            box-shadow: 0 25px 50px -12px rgba(59, 130, 246, 0.25);
        }
        
        .installation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            flex-wrap: wrap;
            gap: 15px;
        }
        
        .location-name {
            font-size: 24px;
            font-weight: 700;
            color: #1e40af;
        }
        
        .efficiency-badge {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 8px 20px;
            border-radius: 25px;
            font-weight: 700;
            font-size: 16px;
            box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);
        }
        
        .installation-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 25px;
        }
        
        .detail-group {
            background: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid #3b82f6;
        }
        
        .detail-label {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 5px;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        
        .detail-value {
            font-size: 18px;
            font-weight: 700;
            color: #1e293b;
        }
        
        .photos-section {
            margin-top: 25px;
            padding-top: 25px;
            border-top: 2px solid #f1f5f9;
        }
        
        .photos-title {
            font-size: 18px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .photo-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
        }
        
        .photo-btn {
            background: linear-gradient(135deg, #3b82f6, #60a5fa);
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
        }
        
        .photo-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 15px -3px rgba(59, 130, 246, 0.4);
            background: linear-gradient(135deg, #1e40af, #3b82f6);
        }
        
        /* Footer */
        .footer {
            background: linear-gradient(135deg, #1e293b 0%, #374151 100%);
            color: white;
            padding: 50px 40px 30px;
            text-align: center;
        }
        
        .footer-content {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .footer h2 {
            font-size: 28px;
            margin-bottom: 20px;
            background: linear-gradient(90deg, #60a5fa, #93c5fd);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .footer p {
            margin-bottom: 15px;
            opacity: 0.9;
        }
        
        .back-button {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            color: white;
            border: none;
            border-radius: 50px;
            padding: 15px 25px;
            cursor: pointer;
            font-weight: 700;
            box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.4);
            transition: all 0.3s ease;
            z-index: 1000;
        }
        
        .back-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 25px -5px rgba(59, 130, 246, 0.5);
        }
        
        /* Responsivo */
        @media (max-width: 768px) {
            .header { padding: 40px 20px; }
            .dashboard { padding: 40px 20px; }
            .logo { font-size: 32px; }
            .subtitle { font-size: 20px; }
            .metric-value { font-size: 36px; }
            .section-title { font-size: 24px; }
            .details-grid { padding: 20px; }
            .installation-header { flex-direction: column; align-items: flex-start; }
            .photo-buttons { justify-content: center; }
        }
        
        /* Animações suaves */
        .fade-in { animation: fadeIn 0.8s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        .slide-up { animation: slideUp 0.8s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <!-- Página Principal -->
    <div class="container main-page">
        <!-- Header Épico -->
        <header class="header">
            <div class="header-content">
                <h1 class="logo">${empresa.icone} ${empresa.nome}</h1>
                <p class="subtitle">Relatório de Instalação Finalizada</p>
                <div class="client-info">
                    <strong>${os.cliente}</strong><br>
                    <span>Instalação concluída em ${new Date(instalacoes[0]?.dataHoraFim || Date.now()).toLocaleDateString('pt-BR')}</span><br>
                    <span>Ordem de Serviço #${os.id}</span>
                </div>
            </div>
        </header>

        <!-- Dashboard Principal -->
        <main class="dashboard">
            <h2 class="section-title">📊 Resultados da Instalação</h2>
            
            <!-- Métricas Principais -->
            <div class="metrics-hero">
                <div class="metric-card">
                    <div class="metric-value">${metricas.instalacoesRealizadas}</div>
                    <div class="metric-label">Instalações Realizadas</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${metricas.reducaoMedia}%</div>
                    <div class="metric-label">Redução Média de Consumo</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${metricas.economiaMediaPorValvula}</div>
                    <div class="metric-label">lpm Economizados (Média)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${metricas.locaisAnalisados}</div>
                    <div class="metric-label">Locais Analisados</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${metricas.tempoMedioInstalacao}</div>
                    <div class="metric-label">Tempo Médio de Instalação</div>
                </div>
            </div>
            
            <!-- NOVO: Card do Local com Maior Eficiência -->
            <div class="stats-section" style="margin-top: 30px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
                <h3 class="section-title" style="color: white; margin-bottom: 20px;">🏆 Destaque de Eficiência</h3>
                <div style="text-align: center;">
                    <div style="font-size: 32px; font-weight: 900; margin-bottom: 10px;">${metricas.localMaiorEficiencia.local}</div>
                    <div style="font-size: 48px; font-weight: 900; margin-bottom: 10px;">${metricas.localMaiorEficiencia.reducao.toFixed(1)}%</div>
                    <div style="font-size: 18px; opacity: 0.9;">Local com Maior Redução de Consumo</div>
                </div>
            </div>

            <!-- Estatísticas Detalhadas -->
            <div class="stats-section">
                <h3 class="section-title" style="font-size: 24px; margin-bottom: 30px;">📈 Análise Detalhada</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-title">Fluxo Médio Pré-Instalação (lpm)</div>
                        <div class="stat-value">${metricas.fluxoAntesMedio}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-title">Fluxo Médio Pós-Instalação (lpm)</div>
                        <div class="stat-value">${metricas.fluxoDepoisMedio}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-title">Economia Total (lpm)</div>
                        <div class="stat-value">${metricas.economiaTotal}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-title">Pontos Analisados</div>
                        <div class="stat-value">${metricas.pontosAnalisados}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-title">Instalações Realizadas</div>
                        <div class="stat-value">${metricas.instalacoesRealizadas}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-title">Pontos Dispensados</div>
                        <div class="stat-value">${metricas.pontosDispensados}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-title">Eficiência Efetiva</div>
                        <div class="stat-value">${metricas.eficienciaEfetiva}%</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-title">Eficiência Global</div>
                        <div class="stat-value">${metricas.eficienciaGlobal}%</div>
                    </div>
                </div>
            </div>

            <!-- Resumo Técnico -->
            <div class="technical-summary">
                <h3 class="section-title" style="font-size: 24px; margin-bottom: 30px;">🔧 Equipamentos Utilizados</h3>
                <div class="summary-grid">
                    <div class="summary-card">
                        <h4 class="summary-title">⚙️ Êmbolos Instalados</h4>
                        <ul class="equipment-list">
                            ${Object.entries(equipamentos.embolos).map(([tipo, qtd]) => 
                              `<li><span>${tipo}</span><strong>---- ${qtd}un</strong></li>`
                            ).join('')}
                        </ul>
                    </div>
                    <div class="summary-card">
                        <h4 class="summary-title">🔩 Molas Utilizadas</h4>
                        <ul class="equipment-list">
                            ${Object.entries(equipamentos.molas).map(([tipo, qtd]) => 
                              `<li><span>${tipo}</span><strong>---- ${qtd}un</strong></li>`
                            ).join('')}
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- NOVO: Motivos das Instalações Não Efetivadas -->
            ${Object.keys(metricas.motivosNaoEfetivadas).length > 0 ? `
            <div class="technical-summary" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b;">
                <h3 class="section-title" style="color: #d97706; font-size: 24px; margin-bottom: 30px;">⚠️ Instalações Não Efetivadas</h3>
                <div class="summary-grid">
                    <div class="summary-card" style="background: white; border: 2px solid #f59e0b;">
                        <h4 class="summary-title" style="color: #d97706;">📊 Detalhamento por Motivo</h4>
                        <ul class="equipment-list">
                            ${Object.entries(metricas.motivosNaoEfetivadas).map(([motivo, qtd]) => 
                              `<li><span>${motivo}</span><strong>${qtd}x</strong></li>`
                            ).join('')}
                        </ul>
                        <div style="margin-top: 15px; padding: 10px; background: #fef3c7; border-radius: 8px; text-align: center;">
                            <strong style="color: #d97706;">Total: ${Object.values(metricas.motivosNaoEfetivadas).reduce((sum, qtd) => sum + qtd, 0)} pontos não efetivados</strong>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}
        </main>

            <!-- ✅ SEÇÃO DE DETALHES - INTEGRADA NO EMAIL -->
            <div class="technical-summary" style="margin-top: 40px;">
                <h3 class="section-title" style="font-size: 24px; margin-bottom: 30px;">📋 Detalhes por Instalação</h3>
                
                <div style="display: grid; gap: 30px; padding: 20px;">
                    ${instalacoesProcessadas.map((instalacao, index) => `
                    <div class="installation-card" style="background: white; border-radius: 15px; padding: 25px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 2px solid #f1f5f9; position: relative; overflow: hidden;">
                        <!-- Barra colorida no topo -->
                        <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #1e40af, #3b82f6, #60a5fa);"></div>
                        
                        <div class="installation-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
                            <h3 style="font-size: 22px; font-weight: 700; color: #1e40af; margin: 0;">${instalacao.local}</h3>
                            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 14px;">${instalacao.reducao.toFixed(1)}% economia</div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                            <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border-left: 4px solid #3b82f6;">
                                <div style="font-size: 11px; color: #64748b; margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">Êmbolo Utilizado</div>
                                <div style="font-size: 16px; font-weight: 700; color: #1e293b;">${instalacao.embolo}</div>
                            </div>
                            <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border-left: 4px solid #3b82f6;">
                                <div style="font-size: 11px; color: #64748b; margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">Mola Utilizada</div>
                                <div style="font-size: 16px; font-weight: 700; color: #1e293b;">${instalacao.mola}</div>
                            </div>
                            <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border-left: 4px solid #3b82f6;">
                                <div style="font-size: 11px; color: #64748b; margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">Fluxo Pré-Instalação</div>
                                <div style="font-size: 16px; font-weight: 700; color: #1e293b;">${instalacao.fluxoAntes} lpm</div>
                            </div>
                            <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border-left: 4px solid #3b82f6;">
                                <div style="font-size: 11px; color: #64748b; margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">Fluxo Pós-Instalação</div>
                                <div style="font-size: 16px; font-weight: 700; color: #1e293b;">${instalacao.fluxoDepois} lpm</div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #f1f5f9;">
                            <h4 style="font-size: 16px; font-weight: 700; color: #1e40af; margin-bottom: 15px;">📸 Registro Fotográfico</h4>
                            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                                ${instalacao.fotos.map(foto => 
                                  `<a href="${foto.url}" target="_blank" style="background: linear-gradient(135deg, #3b82f6, #60a5fa); color: white; padding: 8px 16px; border-radius: 20px; text-decoration: none; font-weight: 600; font-size: 12px; display: inline-flex; align-items: center; gap: 6px;">📸 ${foto.tipo}</a>`
                                ).join('')}
                            </div>
                        </div>
                    </div>
                    `).join('')}
                </div>
            </div>
        </main>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-content">
                <h2>${empresa.nome} - ${empresa.descricao}</h2>
                <p>${empresa.textoExcelencia} para <strong>${os.cliente}</strong></p>
                <p>Relatório gerado automaticamente em ${new Date().toLocaleString('pt-BR')}</p>
                <p style="font-size: 14px; opacity: 0.8; margin-top: 20px;">
                    ${empresa.textoDocumento}.<br>
                    <strong>Economia total: ${metricas.economiaTotal} lpm • Economia média: ${metricas.economiaMediaPorValvula} lpm • Eficiência: ${metricas.reducaoMedia}%</strong><br>
                    ${Object.keys(metricas.motivosNaoEfetivadas).length > 0 ? `<strong style="color: #d97706;">${Object.values(metricas.motivosNaoEfetivadas).reduce((sum, qtd) => sum + qtd, 0)} pontos não efetivados por: ${Object.entries(metricas.motivosNaoEfetivadas).map(([motivo, qtd]) => `${qtd} ${motivo}`).join(', ')}</strong><br>` : ''}
                    ${empresa.slogan}.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;

  // Criar corpo do email
  const corpoEmail = `
Prezado(a) ${os.cliente},

🎉 Instalação BlueWorld concluída com sucesso!

✅ Ordem de Serviço #${os.id} finalizada
📅 Data: ${new Date(os.dataInstalacao).toLocaleDateString('pt-BR')}
🏢 Local: ${os.endereco || 'Conforme contrato'}

📊 RESULTADOS PRINCIPAIS:
• ${metricas.totalValvulas} válvulas instaladas
• ${metricas.reducaoMedia}% de redução média
• ${metricas.economiaMediaPorValvula} lpm economizados
• ${metricas.locaisAnalisados} locais analisados
• ${metricas.tempoMedioInstalacao} tempo médio por instalação

📎 Relatório completo anexado (clique duas vezes para abrir)

O arquivo HTML anexo contém:
• Dashboard interativo com navegação
• Detalhes técnicos por instalação
• Registro fotográfico completo
• Análise de equipamentos utilizados

Agradecemos pela confiança em nossa tecnologia!

${empresa.nome} - ${empresa.textoExcelencia}
${empresa.textoDocumento}
`;

  return htmlContent;
  
  } catch (error) {
    console.error('❌ Erro ao gerar relatório HTML:', error);
    throw new Error(`Erro ao gerar relatório HTML: ${error.message}`);
  }
}

// Função para enviar email via Gmail
async function enviarEmailGmail(destinatario, assunto, corpo) {
  try {
    console.log('📧 Iniciando envio de email via Gmail...');
    
    // ✅ CORREÇÃO: Usar configurações OAuth2 ao invés de Service Account
    const configsOAuth = await buscarConfigsOAuth2();
    if (configsOAuth.length === 0) {
      throw new Error('Nenhuma conta OAuth2 configurada para envio de email');
    }
    
    console.log(`📋 Encontradas ${configsOAuth.length} contas OAuth2 disponíveis`);
    
    let ultimoErro = null;
    
    // Tentar enviar com cada conta até conseguir
    for (const conta of configsOAuth) {
      try {
        console.log(`📤 Tentando enviar email com ${conta.nome}...`);
        
        if (!conta.tokens) {
          console.log(`⚠️ ${conta.nome} não possui tokens - pulando...`);
          continue;
        }
        
        const oauth2Client = new google.auth.OAuth2(
          conta.config.client_id,
          conta.config.client_secret,
          "https://oms-blue-world-backend.up.railway.app/auth/callback"
        );
        
        oauth2Client.setCredentials(conta.tokens);
        
        console.log(`🔐 Autenticação OAuth2 configurada para ${conta.nome}`);
        
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        // ✅ CORREÇÃO: Subject com codificação UTF-8 explícita
        const subjectEncoded = `=?UTF-8?B?${Buffer.from(assunto).toString('base64')}?=`;
        
        const emailContent = [
          'Content-Type: text/html; charset="UTF-8"',
          'MIME-Version: 1.0',
          `To: ${destinatario}`,
          `Subject: ${subjectEncoded}`,
          '',
          corpo
        ].join('\n');
        
        const encodedEmail = Buffer.from(emailContent)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: encodedEmail }
        });
        
        console.log(`✅ Email enviado com sucesso via ${conta.nome}`);
        return; // Sucesso - sair do loop
        
      } catch (error) {
        console.error(`❌ Erro ao enviar email via ${conta.nome}:`, error.message);
        ultimoErro = error;
        continue; // Tentar próxima conta
      }
    }
    
    // Se chegou aqui, todas as contas falharam
    throw ultimoErro || new Error('Todas as contas OAuth2 falharam no envio de email');
    
  } catch (error) {
    console.error('❌ Erro geral ao enviar email:', error);
    throw error;
  }
}

// Função para enviar email via Gmail com anexo HTML
// Função para gerar PDF usando Puppeteer
async function gerarPDFRelatorio(htmlContent, nomeArquivo) {
  try {
    console.log(`🔄 Gerando PDF: ${nomeArquivo}`);
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process'
      ]
    });
    
    const page = await browser.newPage();
    
    // Configurar página para funcionar totalmente offline
    await page.setOfflineMode(true);
    await page.setJavaScriptEnabled(false); // Desabilitar JS para evitar erros
    
    // Bloquear TODOS os recursos externos para PDF autocontido
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      // Permitir apenas o HTML principal, bloquear tudo mais
      if (req.resourceType() === 'document') {
        req.continue();
      } else {
        req.abort(); // Bloquear imagens, CSS externos, fontes, etc.
      }
    });
    
    // HTML melhorado com bordas arredondadas e cabeçalho/rodapé aprimorados
    const htmlMelhorado = htmlContent.replace(
      // Melhorar estilo do cabeçalho
      '.header {',
      `.header {
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%);
        border-radius: 12px 12px 0 0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);`
    ).replace(
      // Melhorar estilo do container
      '.container {',
      `.container {
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        overflow: hidden;`
    ).replace(
      // Melhorar estilo do rodapé
      '.footer {',
      `.footer {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 0 0 12px 12px;
        border-top: 3px solid #2563eb;`
    ).replace(
      // Adicionar bordas arredondadas globais
      'border-radius: 8px',
      'border-radius: 12px'
    ).replace(
      'border-radius: 6px',
      'border-radius: 10px'
    ).replace(
      'border-radius: 4px',
      'border-radius: 8px'
    );
    
    // Tornar HTML totalmente autocontido (sem recursos externos)
    const htmlAutocontido = htmlMelhorado
      .replace(/url\(['"]?https?:\/\/[^'")\s]+['"]?\)/g, 'none') // Remove URLs externas
      .replace(/@import\s+url\(['"]?https?:\/\/[^'")\s]+['"]?\);?/g, '') // Remove imports externos
      .replace(/src=['"]https?:\/\/[^'">\s]+['"]/g, 'src=""') // Remove src externos
      .replace(/href=['"]https?:\/\/[^'">\s]+['"]/g, 'href=""'); // Remove href externos
    
    await page.setContent(htmlAutocontido, { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });

    // Configurações do PDF - mantendo visual atrativo mas otimizando tamanho
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '12mm',
        right: '10mm', 
        bottom: '12mm',
        left: '10mm'
      },
      printBackground: true,   // Manter backgrounds para visual atrativo
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      omitBackground: false,   // Manter backgrounds dos cards
      scale: 0.9,              // Redução leve para otimizar tamanho
      tagged: false,           // Desabilitar tags para reduzir tamanho
      outline: false           // Desabilitar outline para reduzir tamanho
    });
    
    await browser.close();
    
    console.log(`✅ PDF gerado com sucesso: ${nomeArquivo} (${Math.round(pdfBuffer.length / 1024)}KB)`);
    return pdfBuffer;
    
  } catch (error) {
    console.error(`❌ Erro ao gerar PDF: ${error.message}`);
    throw error;
  }
}

// Função para enviar email com PDF anexo (nova versão)
async function enviarEmailGmailComPDF(destinatario, assunto, corpo, htmlContent, nomeArquivo) {
  try {
    console.log('📧 Enviando email via Gmail com anexo PDF...');
    
    // Gerar PDF a partir do HTML
    const nomeArquivoPDF = nomeArquivo.replace('.html', '.pdf');
    const pdfBuffer = await gerarPDFRelatorio(htmlContent, nomeArquivoPDF);
    
    const configsOAuth = await buscarConfigsOAuth2();
    if (configsOAuth.length === 0) {
      throw new Error('Nenhuma conta OAuth2 configurada para envio de email');
    }
    
    console.log(`📋 Encontradas ${configsOAuth.length} contas OAuth2 disponíveis`);
    
    let ultimoErro = null;
    
    // Tentar enviar com cada conta até conseguir
    for (const conta of configsOAuth) {
      try {
        console.log(`📤 Tentando enviar email com PDF usando ${conta.nome}...`);
        
        if (!conta.tokens) {
          console.log(`⚠️ ${conta.nome} não possui tokens - pulando...`);
          continue;
        }
        
        const oauth2Client = new google.auth.OAuth2(
          conta.config.client_id,
          conta.config.client_secret,
          "https://oms-blue-world-backend.up.railway.app/auth/callback"
        );
        
        oauth2Client.setCredentials(conta.tokens);
        
        console.log(`🔐 Autenticação OAuth2 configurada para ${conta.nome}`);
        
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        // Codificar PDF em base64
        const pdfBase64 = pdfBuffer.toString('base64');
        
        // Subject com codificação UTF-8
        const subjectEncoded = `=?UTF-8?B?${Buffer.from(assunto).toString('base64')}?=`;
        
        // Corpo do email HTML compacto e moderno
        const corpoEmailHTML = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>BlueWorld - Instalação Concluída</title></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f5f5f5;color:#333;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:30px;text-align:center;color:#fff;">
            <div style="font-size:24px;margin-bottom:8px;">🚰</div>
            <h1 style="margin:0;font-size:24px;font-weight:700;">BlueWorld</h1>
            <p style="margin:8px 0 0 0;font-size:14px;opacity:0.9;">Instalação Concluída</p>
        </div>

        <!-- Conteúdo -->
        <div style="padding:25px;">
            <h2 style="color:#2563eb;margin:0 0 15px 0;">Prezado(a) Cliente,</h2>
            
            <p style="line-height:1.5;margin-bottom:20px;">
                Informamos a <strong>conclusão da instalação</strong> dos dispositivos de economia de água.
            </p>

            <!-- Anexo -->
            <div style="background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
                <h3 style="color:#495057;margin:0 0 10px 0;font-size:16px;">📋 Relatório Anexado</h3>
                <div style="margin:10px 0;">
                    <div style="margin:3px 0;color:#6c757d;font-size:14px;">✓ Detalhamento das instalações</div>
                    <div style="margin:3px 0;color:#6c757d;font-size:14px;">✓ Dados de eficiência</div>
                    <div style="margin:3px 0;color:#6c757d;font-size:14px;">✓ Registro fotográfico</div>
                </div>
                <div style="background:#e9ecef;padding:8px;border-radius:5px;color:#495057;font-size:14px;">
                    <strong>📎 Relatório_Instalacao_BlueWorld.pdf</strong>
                </div>
            </div>

            <p style="line-height:1.5;margin-bottom:15px;">
                Agradecemos pela confiança em nossos serviços.
            </p>

            <p style="line-height:1.5;color:#6c757d;font-size:13px;">
                Para dúvidas, entre em contato conosco.
            </p>
        </div>

        <!-- Footer -->
        <div style="background:#f8f9fa;padding:15px;text-align:center;border-top:1px solid #dee2e6;">
            <h3 style="color:#2563eb;margin:0 0 5px 0;font-size:16px;">BlueWorld</h3>
            <p style="margin:0;color:#6c757d;font-size:13px;">Tecnologia em Economia de Água</p>
            <p style="margin:5px 0 0 0;color:#adb5bd;font-size:11px;">
                Email gerado automaticamente
            </p>
        </div>

    </div>
</body>
</html>`;

        // Criar email com anexo PDF e corpo HTML
        const boundary = '----=_Part_' + Math.random().toString(36).substr(2, 9);
        const emailContent = [
          'MIME-Version: 1.0',
          `To: ${destinatario}`,
          `Subject: ${subjectEncoded}`,
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          'Content-Type: text/html; charset=UTF-8',
          'Content-Transfer-Encoding: 8bit',
          '',
          corpoEmailHTML,
          '',
          `--${boundary}`,
          `Content-Type: application/pdf; name="${nomeArquivoPDF}"`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${nomeArquivoPDF}"`,
          '',
          pdfBase64,
          '',
          `--${boundary}--`
        ].join('\n');
        
        // Enviar email
        const response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
          }
        });
        
        console.log(`✅ Email com PDF enviado com sucesso usando ${conta.nome}! ID: ${response.data.id}`);
        console.log(`📊 Tamanho do PDF: ${Math.round(pdfBuffer.length / 1024)}KB`);
        
        return {
          success: true,
          messageId: response.data.id,
          conta: conta.nome,
          tamanhoArquivo: `${Math.round(pdfBuffer.length / 1024)}KB`,
          tipoAnexo: 'PDF'
        };
        
      } catch (contaError) {
        console.error(`❌ Erro ao enviar com ${conta.nome}:`, contaError.message);
        ultimoErro = contaError;
        continue;
      }
    }
    
    // Se chegou aqui, nenhuma conta funcionou
    throw ultimoErro || new Error('Falha em todas as contas OAuth2 disponíveis');
    
  } catch (error) {
    console.error('❌ Erro no envio de email com PDF:', error);
    throw error;
  }
}

async function enviarEmailGmailComAnexo(destinatario, assunto, corpo, htmlContent, nomeArquivo) {
  try {
    console.log('📧 Enviando email via Gmail com anexo HTML...');
    
    // ✅ CORREÇÃO: Usar configurações OAuth2 ao invés de Service Account
    const configsOAuth = await buscarConfigsOAuth2();
    if (configsOAuth.length === 0) {
      throw new Error('Nenhuma conta OAuth2 configurada para envio de email');
    }
    
    console.log(`📋 Encontradas ${configsOAuth.length} contas OAuth2 disponíveis`);
    
    let ultimoErro = null;
    
    // Tentar enviar com cada conta até conseguir
    for (const conta of configsOAuth) {
      try {
        console.log(`📤 Tentando enviar email com ${conta.nome}...`);
        
        if (!conta.tokens) {
          console.log(`⚠️ ${conta.nome} não possui tokens - pulando...`);
          continue;
        }
        
        const oauth2Client = new google.auth.OAuth2(
          conta.config.client_id,
          conta.config.client_secret,
          "https://oms-blue-world-backend.up.railway.app/auth/callback"
        );
        
        oauth2Client.setCredentials(conta.tokens);
        
        console.log(`🔐 Autenticação OAuth2 configurada para ${conta.nome}`);
        
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        
        // Codificar conteúdo HTML em base64
        const htmlBase64 = Buffer.from(htmlContent).toString('base64');
        
        // ✅ CORREÇÃO: Subject com codificação UTF-8 explícita
        const subjectEncoded = `=?UTF-8?B?${Buffer.from(assunto).toString('base64')}?=`;
        
        // Criar email com anexo
        const boundary = '----=_Part_' + Math.random().toString(36).substr(2, 9);
        const emailContent = [
          'MIME-Version: 1.0',
          `To: ${destinatario}`,
          `Subject: ${subjectEncoded}`,
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          '',
          `--${boundary}`,
          'Content-Type: text/plain; charset=UTF-8',
          'Content-Transfer-Encoding: 8bit',
          '',
          corpo,
          '',
          `--${boundary}`,
          'Content-Type: text/html; charset=UTF-8',
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${nomeArquivo}"`,
          '',
          htmlBase64,
          '',
          `--${boundary}--`
        ].join('\n');
        
        const encodedEmail = Buffer.from(emailContent)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: encodedEmail }
        });
        
        console.log(`✅ Email com anexo enviado com sucesso via ${conta.nome}`);
        return; // Sucesso - sair do loop
        
      } catch (error) {
        console.error(`❌ Erro ao enviar email via ${conta.nome}:`, error.message);
        ultimoErro = error;
        continue; // Tentar próxima conta
      }
    }
    
    // Se chegou aqui, todas as contas falharam
    throw ultimoErro || new Error('Todas as contas OAuth2 falharam no envio de email');
    
  } catch (error) {
    console.error('❌ Erro ao enviar email via Gmail:', error);
    throw error;
  }
}

// ========== CONECTIVITY TEST ==========

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'API OMS backend online!' });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// ===== ENDPOINT FIXO ÚNICO PARA TODOS OS RELATÓRIOS =====
app.get('/relatorio', async (req, res) => {
  try {
    // Pega o ID da OS de qualquer parâmetro disponível
    const osId = req.query.os || req.query.id || req.query.osid || req.query.ordem;
    
    console.log(`📊 Endpoint FIXO /relatorio chamado - Parâmetros: ${JSON.stringify(req.query)}`);
    
    // Se não tem parâmetros, pega a primeira OS com relatório disponível
    if (!osId) {
      console.log('🔍 Sem parâmetros, buscando primeira OS com relatório...');
      
      const primeiroRelatorio = await prisma.relatorios_html.findFirst({
        where: { status: 'ATIVO' },
        orderBy: { dataGeracao: 'desc' }
      });
      
      if (primeiroRelatorio) {
        console.log(`✅ Renderizando primeiro relatório disponível: OS #${primeiroRelatorio.osId} - ${primeiroRelatorio.clienteNome}`);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(primeiroRelatorio.htmlContent);
      }
      
      // Se não tem nenhuma OS com relatório, mostra página de instruções
      const htmlInicial = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>BlueWorld - Relatórios</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 50px; background: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; }
            .status { background: #e74c3c; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .instructions { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .url-example { background: #2ecc71; color: white; padding: 15px; border-radius: 5px; font-family: monospace; margin: 10px 0; }
            p { margin: 15px 0; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🏢 BlueWorld - Sistema de Relatórios</h1>
            
            <div class="status">
              <h2>📊 Nenhum relatório disponível</h2>
              <p>Ainda não há relatórios gerados no sistema.</p>
            </div>
            
            <div class="instructions">
              <h3>📋 Como usar este endpoint:</h3>
              <p><strong>URL FIXA:</strong> Esta mesma URL sempre renderiza páginas diferentes!</p>
              
              <h4>🎯 Exemplos de uso:</h4>
              <div class="url-example">
                ${req.protocol}://${req.get('host')}/relatorio?os=4
              </div>
              <div class="url-example">
                ${req.protocol}://${req.get('host')}/relatorio?id=5
              </div>
              <div class="url-example">
                ${req.protocol}://${req.get('host')}/relatorio
              </div>
              <p><small>Sem parâmetros: Mostra o relatório mais recente disponível</small></p>
            </div>
            
            <div class="instructions">
              <h3>⚙️ Para gerar relatórios:</h3>
              <p>1. Crie uma Ordem de Serviço</p>
              <p>2. Execute as instalações</p>
              <p>3. Finalize a OS</p>
              <p>4. O relatório será gerado automaticamente</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(htmlInicial);
    }
    
    console.log(`🔍 Buscando relatório da OS #${osId}...`);
    
    const relatorio = await prisma.relatorios_html.findFirst({
      where: { 
        osId: Number(osId),
        status: 'ATIVO'
      }
    });
    
    if (relatorio) {
      console.log(`✅ Relatório encontrado para OS #${osId} - Cliente: ${relatorio.clienteNome}`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(relatorio.htmlContent);
    }
    
    // Se não encontrou relatório, buscar dados da OS para mostrar informações
    const ordem = await prisma.ordemservico.findUnique({
      where: { id: Number(osId) },
      select: { 
        id: true,
        cliente: true,
        status: true
      }
    });
    
    if (!ordem) {
      const htmlNotFound = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>OS não encontrada</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 50px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
            h1 { color: #e74c3c; }
            .retry { background: #3498db; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .retry a { color: white; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ OS #${osId} não encontrada</h1>
            <p>Esta Ordem de Serviço não existe no sistema.</p>
            <div class="retry">
              <a href="${req.protocol}://${req.get('host')}/relatorio">🔄 Ver relatório mais recente</a>
            </div>
          </div>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(404).send(htmlNotFound);
    }
    
    console.log(`📋 OS encontrada: ${ordem.cliente} - Status: ${ordem.status}`);
    
    if (!ordem.observacao) {
      const htmlSemRelatorio = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Relatório não disponível</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 50px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
            h1 { color: #f39c12; }
            .info { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .retry { background: #3498db; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .retry a { color: white; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📊 Relatório não disponível</h1>
            <div class="info">
              <p><strong>OS:</strong> #${ordem.id}</p>
              <p><strong>Cliente:</strong> ${ordem.cliente}</p>
              <p><strong>Status:</strong> ${ordem.status}</p>
            </div>
            <p>O relatório desta OS ainda não foi gerado.</p>
            <p>Finalize a OS para gerar o relatório automaticamente.</p>
            <div class="retry">
              <a href="${req.protocol}://${req.get('host')}/relatorio">🔄 Ver relatório mais recente</a>
            </div>
          </div>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(htmlSemRelatorio);
    }
    
  } catch (error) {
    console.error('❌ Erro no endpoint /relatorio:', error);
    
    const htmlErro = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Erro interno</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 50px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
          h1 { color: #e74c3c; }
          .retry { background: #3498db; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .retry a { color: white; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ Erro interno</h1>
          <p>Erro ao carregar relatório: ${error.message}</p>
          <div class="retry">
            <a href="${req.protocol}://${req.get('host')}/relatorio">🔄 Tentar novamente</a>
          </div>
        </div>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send(htmlErro);
  }
});

// ******** ENDPOINT OAUTH CALLBACK ********
app.get('/auth/callback', async (req, res) => {
  try {
    const { code, error, state } = req.query;
    
    console.log('🔑 OAuth Callback recebido:', { code: code ? 'Presente' : 'Ausente', error, state });
    
    if (error) {
      console.error('❌ Erro OAuth:', error);
      return res.status(400).json({ 
        success: false, 
        error: 'Autorização negada pelo usuário', 
        details: error 
      });
    }
    
    if (!code) {
      console.error('❌ Código de autorização ausente');
      return res.status(400).json({ 
        success: false, 
        error: 'Código de autorização não recebido' 
      });
    }
    
    // ✅ DETECTAR QUAL CONTA baseado no state
    let chaveConfig = 'oauth_config'; // Padrão legacy
    let chaveTokens = 'oauth_tokens'; // Padrão legacy
    
    if (state && state.includes('foto-upload-')) {
      const contaNumero = state.split('-')[2]; // foto-upload-1 ou foto-upload-2
      chaveConfig = `oauth_config_conta_${contaNumero}`;
      chaveTokens = `oauth_tokens_conta_${contaNumero}`;
      console.log(`📸 OAuth para upload fotos - Conta ${contaNumero}`);
    } else if (state && state.includes('gmail-auth-')) {
      const contaNumero = state.split('-')[2]; // gmail-auth-conta_1 ou gmail-auth-conta_2  
      chaveConfig = `oauth_config_${contaNumero}`;
      chaveTokens = `oauth_tokens_${contaNumero}`;
      console.log(`📧 OAuth para Gmail + Drive - ${contaNumero}`);
    } else if (state && state.includes('config-conta-')) {
      // Novo: Configuração via interface web
      const contaNumero = state.split('-')[2]; // config-conta-1 ou config-conta-2
      chaveConfig = `oauth_config_conta_${contaNumero}`;
      chaveTokens = `oauth_tokens_conta_${contaNumero}`;
      console.log(`⚙️ OAuth para configuração web - Conta ${contaNumero}`);
    } else if (state === 'config-general') {
      // Configuração completa - usar Conta 1 por padrão
      chaveConfig = 'oauth_config_conta_1';
      chaveTokens = 'oauth_tokens_conta_1';
      console.log(`⚙️ OAuth para configuração completa - Conta 1`);
    } else if (state === 'instalacao-fotos') {
      // Upload de fotos - usar Conta 1 por padrão
      chaveConfig = 'oauth_config_conta_1';
      chaveTokens = 'oauth_tokens_conta_1';
      console.log(`📸 OAuth para upload fotos - Conta 1`);
    } else if (state === 'email-config') {
      // Configuração de email - usar Conta 1 por padrão
      chaveConfig = 'oauth_config_conta_1';
      chaveTokens = 'oauth_tokens_conta_1';
      console.log(`📧 OAuth para configuração email - Conta 1`);
    }
    
    // Buscar configuração OAuth da conta correta
    const oauthConfigRow = await prisma.ConfiguracaoSistema.findUnique({
      where: { chave: chaveConfig }
    });
    
    if (!oauthConfigRow) {
      console.error('❌ Configuração OAuth não encontrada');
      return res.status(500).json({ 
        success: false, 
        error: 'Configuração OAuth não encontrada' 
      });
    }
    
    const oauthConfig = JSON.parse(oauthConfigRow.valor);
    
    // Criar cliente OAuth
    const oauth2Client = new google.auth.OAuth2(
      oauthConfig.client_id,
      oauthConfig.client_secret,
      'https://oms-blue-world-backend.up.railway.app/auth/callback'
    );
    
    // Trocar código por tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    console.log('✅ Tokens OAuth obtidos com sucesso!');
    
    // Salvar tokens no banco
    const tokenConfig = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
      status: 'ATIVA',
      ordem: 0,
      setup_complete: true
    };
    
    await prisma.configuracaoSistema.upsert({
      where: { chave: chaveTokens },
      update: { 
        valor: JSON.stringify(tokenConfig),
        descricao: `Tokens OAuth2 para Google Drive - ${chaveTokens}`
      },
      create: {
        chave: chaveTokens,
        valor: JSON.stringify(tokenConfig),
        tipo: 'JSON',
        descricao: `Tokens OAuth2 para Google Drive - ${chaveTokens}`
      }
    });
    
    console.log('🎯 OAuth configurado com sucesso!');
    
    // Redirecionar baseado no contexto (state parameter)
    const baseUrl = 'https://blueworld.up.railway.app';
    let redirectUrl;
    
    if (state && state.includes('instalacao')) {
      // Contexto: Upload de fotos durante instalação
      // Extrair instalacaoId e step do state (formato: "instalacao-123-step-2")
      const matches = state.match(/instalacao-(\d+)-step-(\d+)/);
      if (matches) {
        const instalacaoId = matches[1];
        const currentStep = parseInt(matches[2]);
        const nextStep = currentStep + 1;
        redirectUrl = `${baseUrl}/instalacao-fluxo/${instalacaoId}?step=${nextStep}&oauth=success`;
      } else {
        redirectUrl = `${baseUrl}/painel-instalacoes?oauth=success`;
      }
    } else if (state && state.includes('email')) {
      // Contexto: Configuração de email
      redirectUrl = `${baseUrl}/painel-instalacoes?email=success`;
    } else if (state && state.includes('config-conta-')) {
      // Novo: Configuração via interface web
      const contaNumero = state.split('-')[2];
      redirectUrl = `${baseUrl}/sistema/configuracoes?oauth=success&conta=${contaNumero}`;
    } else if (state && state.includes('gmail-auth-')) {
      // Configuração Gmail específica
      const contaNumero = state.split('-')[2];
      redirectUrl = `${baseUrl}/sistema/configuracoes?gmail=success&conta=${contaNumero}`;
    } else {
      // Contexto padrão: Configurações
      redirectUrl = `${baseUrl}/sistema/configuracoes?oauth=success`;
    }
    
    console.log('🔄 Redirecionando para:', redirectUrl);
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('❌ Erro no callback OAuth:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro interno no processamento OAuth',
      details: error.message 
    });
  }
});

// ******** ENDPOINTS DE AUTENTICAÇÃO ********

app.post('/api/login', async (req, res) => {
  try {
    const { cpf, senha } = req.body;
    console.log(`Tentativa de login: CPF=${cpf}, Senha=${senha ? '******' : 'vazia'}`);
    
    if (!cpf || !senha) {
      console.log('Login falhou: CPF ou senha não fornecidos');
      return res.status(400).json({ error: 'CPF e senha obrigatórios' });
    }

    // Limpa o CPF de qualquer caractere não numérico
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    // Busca usuário no banco
    const usuario = await prisma.usuario.findUnique({ 
      where: { cpf: cpfLimpo } 
    });
    
    if (!usuario) {
      console.log(`Login falhou: CPF ${cpfLimpo} não encontrado`);
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificação de senha - aceita tanto bcrypt quanto texto simples
    let senhaValida = false;
    
    // Primeiro tenta comparação direta (texto simples)
    if (usuario.senha === senha) {
      senhaValida = true;
      console.log(`Verificação texto simples: ${senhaValida}`);
    } else {
      // Se não for texto simples, tenta bcrypt
      try {
        senhaValida = await bcrypt.compare(senha, usuario.senha);
        console.log(`Verificação bcrypt: ${senhaValida}`);
      } catch (e) {
        // Se der erro no bcrypt, mantém false
        console.log(`Erro ao verificar bcrypt: ${e.message}`);
        senhaValida = false;
      }
    }
    
    if (!senhaValida) {
      console.log(`Login falhou: Senha incorreta para ${usuario.nome} (${usuario.cpf})`);
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    
    console.log(`Login bem sucedido: ${usuario.nome} (${usuario.cpf})`);

    // Cria token JWT
    const token = jwt.sign({
      id: usuario.id,
      nome: usuario.nome,
      sobrenome: usuario.sobrenome,
      cpf: usuario.cpf,
      email: usuario.email,
      perfil: usuario.perfil,
      status: usuario.status
    }, process.env.JWT_SECRET, { expiresIn: '3h' });

    // Remove a senha do objeto de usuário antes de enviar na resposta
    const { senha: _, ...usuarioSemSenha } = usuario;
    res.json({ success: true, usuario: usuarioSemSenha, token });
  } catch (e) {
    console.error("Erro no /api/login:", e);
    console.error("Stack trace:", e.stack);
    console.error("JWT_SECRET definido?", !!process.env.JWT_SECRET);
    res.status(500).json({ 
      error: "Erro interno no login",
      details: e.message,
      jwt_configured: !!process.env.JWT_SECRET
    });
  }
});

// ******** ENDPOINTS DE USUÁRIOS ********

app.get('/api/usuarios', authenticateToken, async (req, res) => {
  try {
    const users = await prisma.usuario.findMany({ 
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        sobrenome: true,
        cpf: true,
        email: true,
        perfil: true,
        status: true,
        telefone: true,
        dataCadastro: true
      }
    });
    res.json(users);
  } catch (e) {
    console.error("Erro ao listar usuários:", e);
    res.status(500).json({ error: "Erro ao listar usuários" });
  }
});

app.get('/api/usuarios/buscar/:cpf', authenticateToken, async (req, res) => {
  try {
    const { cpf } = req.params;
    const usuario = await prisma.usuario.findUnique({ 
      where: { cpf: cpf.replace(/\D/g, '') },
      select: {
        id: true,
        nome: true,
        sobrenome: true,
        cpf: true,
        email: true,
        perfil: true,
        status: true,
        telefone: true
      }
    });
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(usuario);
  } catch (e) {
    console.error("Erro ao buscar usuário:", e);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

app.post('/api/usuarios', authenticateToken, async (req, res) => {
  try {
    const { nome, sobrenome, cpf, email, senha, perfil, telefone } = req.body;
    
    const cpfLimpo = cpf.replace(/\D/g, '');
    const usuarioExistente = await prisma.usuario.findUnique({ where: { cpf: cpfLimpo } });
    
    if (usuarioExistente) {
      return res.status(400).json({ error: 'CPF já cadastrado' });
    }
    
    // Usar senha fornecida ou buscar padrão
    let senhaFinal = senha;
    if (!senha) {
      const senhaPadrao = await getConfiguracaoSistema('SENHA_PADRAO_NOVO_USUARIO');
      if (!senhaPadrao) {
        return res.status(500).json({ 
          error: 'Configuração SENHA_PADRAO_NOVO_USUARIO não encontrada' 
        });
      }
      senhaFinal = senhaPadrao;
    }
    
    // Hash da senha
    const senhaHash = await bcrypt.hash(senhaFinal, 10);
    
    const novoUsuario = await prisma.usuario.create({
      data: {
        nome: nome.trim(),
        sobrenome: sobrenome.trim(),
        cpf: cpfLimpo,
        email: email.trim().toLowerCase(),
        senha: senhaHash,
        perfil,
        telefone: telefone || '',
        status: 'ATIVADO'
      }
    });
    
    const { senha: _, ...usuarioSemSenha } = novoUsuario;
    res.json({ success: true, usuario: usuarioSemSenha });
  } catch (e) {
    console.error("Erro ao criar usuário:", e);
    if (e.code === 'P2002') {
      res.status(400).json({ error: 'CPF já existe no sistema' });
    } else {
      res.status(400).json({ error: e.message });
    }
  }
});

app.put('/api/usuarios/atualizar/:cpf', authenticateToken, async (req, res) => {
  try {
    const { cpf } = req.params;
    const dados = req.body;
    
    const usuarioAtualizado = await prisma.usuario.update({
      where: { cpf: cpf.replace(/\D/g, '') },
      data: dados
    });
    
    const { senha: _, ...usuarioSemSenha } = usuarioAtualizado;
    res.json({ success: true, usuario: usuarioSemSenha });
  } catch (e) {
    console.error("Erro ao atualizar usuário:", e);
    if (e.code === 'P2025') {
      res.status(404).json({ error: 'Usuário não encontrado' });
    } else {
      res.status(400).json({ error: 'Erro ao atualizar usuário' });
    }
  }
});

app.delete('/api/usuarios/deletar/:cpf', authenticateToken, async (req, res) => {
  try {
    const { cpf } = req.params;
    
    await prisma.usuario.delete({
      where: { cpf: cpf.replace(/\D/g, '') }
    });
    
    res.json({ success: true });
  } catch (e) {
    if (e.code === 'P2025') {
      res.status(404).json({ error: 'Usuário não encontrado' });
    } else {
      res.status(400).json({ error: 'Erro ao deletar usuário' });
    }
  }
});

app.patch('/api/usuarios/senha/:cpf', authenticateToken, async (req, res) => {
  try {
    const { cpf } = req.params;
    const { senhaAtual, novaSenha } = req.body;
    
    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }
    
    const usuario = await prisma.usuario.findUnique({
      where: { cpf: cpf.replace(/\D/g, '') }
    });
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar senha atual
    let senhaValida = false;
    try {
      senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
    } catch {
      senhaValida = (usuario.senha === senhaAtual);
    }
    
    if (!senhaValida) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }
    
    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);
    
    await prisma.usuario.update({
      where: { cpf: cpf.replace(/\D/g, '') },
      data: { senha: novaSenhaHash }
    });
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ******** ENDPOINTS DE ORDENS DE SERVIÇO ********

app.get('/api/ordens-servico', authenticateToken, async (req, res) => {
  try {
    console.log(`🔍 Listando OS - Usuário: ${req.user.nome} (${req.user.perfil})`);
    
    let whereClause = {};
    
    // ✅ FILTRO POR PERFIL - SEGURANÇA CRÍTICA
    if (req.user.perfil === 'ADMIN' || req.user.perfil === 'GESTOR') {
      // ADMIN e GESTOR veem todas as ordens
      console.log(`👁️ Perfil ${req.user.perfil} - Visualizando TODAS as OS`);
    } else if (req.user.perfil === 'COMERCIAL' || req.user.perfil === 'OPERADOR') {
      // COMERCIAL e OPERADOR veem: OS que criaram OU OS onde fazem parte da equipe
      whereClause = {
        OR: [
          { criadorId: req.user.id }, // OS que criaram
          { 
            equipeVinculo: {
              some: {
                usuarioId: req.user.id
              }
            }
          } // OS onde fazem parte da equipe
        ]
      };
      console.log(`👁️ Perfil ${req.user.perfil} - Visualizando OS criadas OU da equipe do usuário ${req.user.id}`);
    } else {
      // Perfil não reconhecido - negar acesso
      console.log(`❌ Perfil não reconhecido: ${req.user.perfil}`);
      return res.status(403).json({ error: 'Perfil de usuário não autorizado' });
    }

    const ordens = await prisma.ordemservico.findMany({
      where: whereClause,
      include: {
        criador: true,
        equipeVinculo: {
          include: {
            usuario: {
              select: { id: true, nome: true, sobrenome: true, perfil: true }
            }
          }
        },
        instalacoes: true
      },
      orderBy: { dataCriacao: 'desc' }
    });
    
    console.log(`✅ Retornando ${ordens.length} OS para ${req.user.perfil}`);
    res.json(ordens);
    
  } catch (error) {
    console.error('❌ Erro ao listar OS:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/ordens-servico/para-instalacao', authenticateToken, async (req, res) => {
  try {
    console.log(`🔍 Listando OS para instalação - Usuário: ${req.user.nome} (${req.user.perfil})`);
    
    let whereClause = {
      status: { in: ['LIBERADA', 'INICIADA'] }
    };
    
    // ✅ FILTRO POR PERFIL - SEGURANÇA CRÍTICA
    if (req.user.perfil === 'ADMIN' || req.user.perfil === 'GESTOR') {
      // ADMIN e GESTOR veem todas as ordens para instalação
      console.log(`👁️ Perfil ${req.user.perfil} - Visualizando TODAS as OS para instalação`);
    } else if (req.user.perfil === 'COMERCIAL' || req.user.perfil === 'OPERADOR') {
      // COMERCIAL e OPERADOR veem: OS que criaram OU OS onde fazem parte da equipe
      whereClause.OR = [
        { criadorId: req.user.id }, // OS que criaram
        { 
          equipeVinculo: {
            some: {
              usuarioId: req.user.id
            }
          }
        } // OS onde fazem parte da equipe
      ];
      console.log(`👁️ Perfil ${req.user.perfil} - Visualizando OS criadas OU da equipe para instalação`);
    } else {
      // Perfil não reconhecido - negar acesso
      console.log(`❌ Perfil não reconhecido: ${req.user.perfil}`);
      return res.status(403).json({ error: 'Perfil de usuário não autorizado' });
    }

    const ordens = await prisma.ordemservico.findMany({
      where: whereClause,
      include: {
        criador: { select: { nome: true, sobrenome: true } },
        equipeVinculo: {
          include: {
            usuario: {
              select: { id: true, nome: true, sobrenome: true }
            }
          }
        }
      },
      orderBy: { dataCriacao: 'desc' }
    });
    
    console.log(`✅ Retornando ${ordens.length} OS para instalação para ${req.user.perfil}`);
    res.json(ordens);
    
  } catch (error) {
    console.error('❌ Erro ao listar OS para instalação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/ordens-servico', authenticateToken, async (req, res) => {
  try {
    const {
      cliente, responsavel, telefone, email, idVenda,
      complemento, observacao, equipeIds,
      enderecoCEP, enderecoLogradouro, enderecoNumero,
      enderecoBairro, enderecoCidade, enderecoEstado
    } = req.body;
    
    const novaOS = await prisma.ordemservico.create({
      data: {
        cliente, responsavel, telefone, email, idVenda,
        complemento, observacao, enderecoCEP, enderecoLogradouro,
        enderecoNumero, enderecoBairro, enderecoCidade, enderecoEstado,
        status: 'ABERTA',
    criadorId: req.user.id,		
        equipeVinculo: {
          create: equipeIds.map(usuarioId => ({
            usuarioId: parseInt(usuarioId)
          }))
        }
      }
    });

    // Criar notificação para gestores e admins aprovarem a OS
    try {
      const gestoresAdmins = await prisma.usuario.findMany({
        where: {
          perfil: { in: ['ADMIN', 'GESTOR'] },
          status: 'ATIVADO'
        },
        select: { id: true, cpf: true }
      });

      const equipeNomes = await prisma.usuario.findMany({
        where: { id: { in: equipeIds.map(id => parseInt(id)) } },
        select: { nome: true, sobrenome: true }
      });

      const equipesTexto = equipeNomes.map(u => `${u.nome} ${u.sobrenome}`).join(', ');

      // Criar notificação para cada gestor/admin
      for (const user of gestoresAdmins) {
        await prisma.notificacao.create({
          data: {
            titulo: 'Nova Ordem de Serviço para Aprovação',
            mensagem: `OS criada para ${cliente} - ${enderecoCidade || 'Cidade não informada'}`,
            tipo: 'OS_APROVACAO',
            destinatarioId: user.id,
            destinatarioCPF: user.cpf,
            lida: false,
            dadosExtras: {
              osId: novaOS.id,
              cliente,
              responsavel,
              telefone,
              cidade: enderecoCidade,
              equipe: equipesTexto
            }
          }
        });
      }

      console.log(`✅ Notificações criadas para ${gestoresAdmins.length} gestores/admins sobre nova OS ${novaOS.id}`);
    } catch (notifError) {
      console.error('Erro ao criar notificações:', notifError);
      // Não falha a criação da OS se houver erro nas notificações
    }
    
    res.json({ success: true, ordemServico: novaOS });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint PUT atualizado com sistema de relatórios otimizado
app.put('/api/ordens-servico/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { equipeIds, ...updateData } = req.body;
    
    console.log(`🔄 Atualizando OS ${id} - Usuario: ${req.user.id}`);
    
    // Preparar dados para atualização
    const dataToUpdate = { ...updateData };
    
    // Se equipeIds foi enviado, converter para relação equipeVinculo
    if (equipeIds && Array.isArray(equipeIds)) {
      console.log(`👥 Atualizando equipe: ${equipeIds}`);
      
      dataToUpdate.equipeVinculo = {
        deleteMany: {}, // Remove todos os vínculos existentes
        create: equipeIds.map(usuarioId => ({
          usuarioId: parseInt(usuarioId)
        }))
      };
    }
    
    const osAtualizada = await prisma.ordemservico.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      include: {
        criador: {
          select: { nome: true, sobrenome: true, perfil: true }
        },
        equipeVinculo: {
          include: {
            usuario: {
              select: { id: true, nome: true, sobrenome: true, perfil: true }
            }
          }
        }
      }
    });
    
    res.json(osAtualizada);
  } catch (error) {
    console.error('Erro ao atualizar OS:', error);
    res.status(500).json({ error: 'Erro ao atualizar OS' });
  }
});

// Endpoints de relatórios já implementados acima
    
app.patch('/api/ordens-servico/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, motivoRejeicao } = req.body;
    
    console.log(`🔄 Tentando alterar status da OS ${id} para: ${status}`);
    console.log(`👤 Usuario: ${req.user.id} (${req.user.perfil})`);
    
    // Validar se o status é válido
    const statusValidos = ['ABERTA', 'LIBERADA', 'INICIADA', 'INSTALADA', 'CONCLUIDA', 'REJEITADA'];
    if (!statusValidos.includes(status)) {
      console.log(`❌ Status inválido: ${status}`);
      return res.status(400).json({ error: `Status inválido. Deve ser um dos: ${statusValidos.join(', ')}` });
    }
    
    // Verificar se a OS existe
    const osExistente = await prisma.ordemservico.findUnique({
      where: { id: parseInt(id) },
      include: {
        criador: true,
        equipeVinculo: {
          include: {
            usuario: {
              select: { nome: true, sobrenome: true }
            }
          }
        }
      }
    });
    
    if (!osExistente) {
      console.log(`❌ OS ${id} não encontrada`);
      return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    }
    
    console.log(`📋 OS encontrada. Status atual: ${osExistente.status} → Novo: ${status}`);
    
    // Atualizar status com campos de timestamp automáticos
    const dadosAtualizacao = { status };
    
    // Se for rejeição, adicionar motivo nas observações
    if (status === 'REJEITADA' && motivoRejeicao) {
      const observacaoAtual = osExistente.observacao || '';
      const novaObservacao = observacaoAtual ? 
        `${observacaoAtual}\n\nMOTIVO DA REJEIÇÃO: ${motivoRejeicao}` : 
        `MOTIVO DA REJEIÇÃO: ${motivoRejeicao}`;
      dadosAtualizacao.observacao = novaObservacao;
    }
    
    // Adicionar timestamp baseado no status
    switch (status) {
      case 'LIBERADA':
        dadosAtualizacao.dataLiberacao = new Date();
        break;
      case 'INICIADA':
        dadosAtualizacao.dataInicio = new Date();
        break;
      case 'INSTALADA':
        dadosAtualizacao.dataInstalada = new Date();
        break;
      case 'CONCLUIDA':
        dadosAtualizacao.dataConclusao = new Date();
        break;
    }
    
    console.log(`💾 Dados para atualização:`, dadosAtualizacao);
    
    const osAtualizada = await prisma.ordemservico.update({
      where: { id: parseInt(id) },
      data: dadosAtualizacao
    });

    // Marcar notificações da OS como lidas para todos os gerentes quando aprovada ou concluída
    try {
      if (status === 'LIBERADA' || status === 'CONCLUIDA') {
        console.log(`🔔 Marcando notificações da OS ${id} como lidas para todos os gerentes (status: ${status})`);
        
        // Buscar todos os gerentes ativos
        const gestores = await prisma.usuario.findMany({
          where: {
            perfil: { in: ['ADMIN', 'GESTOR'] },
            status: 'ATIVADO'
          },
          select: { id: true }
        });
        
        const gestorIds = gestores.map(g => g.id);
        
        // Marcar todas as notificações relacionadas à OS como lidas para todos os gerentes
        const resultLidas = await prisma.notificacao.updateMany({
          where: {
            dadosExtras: {
              path: ['osId'],
              equals: parseInt(id)
            },
            destinatarioId: { in: gestorIds },
            lida: false
          },
          data: { lida: true }
        });
        
        console.log(`✅ ${resultLidas.count} notificações da OS ${id} marcadas como lidas para todos os gerentes`);
      }
    } catch (notifLidaError) {
      console.error('Erro ao marcar notificações como lidas:', notifLidaError);
      // Não falha a operação se houver erro ao marcar como lidas
    }

    // Criar notificações baseadas no novo status
    try {
      if (status === 'INICIADA') {
        // ✅ NOVA NOTIFICAÇÃO - OS iniciada pela equipe
        const gestoresAdmins = await prisma.usuario.findMany({
          where: {
            perfil: { in: ['ADMIN', 'GESTOR'] },
            status: 'ATIVADO'
          },
          select: { id: true, cpf: true }
        });

        for (const user of gestoresAdmins) {
          await prisma.notificacao.create({
            data: {
              titulo: 'Equipe Iniciou Serviço',
              mensagem: `As instalações da OS #${id} foram iniciadas.`,
              tipo: 'OS_INICIADA',
              destinatarioId: user.id,
              destinatarioCPF: user.cpf,
              lida: false,
              dadosExtras: {
                osId: parseInt(id),
                cliente: osExistente.cliente,
                cidade: osExistente.enderecoCidade
              }
            }
          });
        }

        console.log(`✅ Notificações OS_INICIADA criadas para ${gestoresAdmins.length} gestores/admins sobre OS ${id}`);
      } else if (status === 'INSTALADA') {
        // Notificar gestores e admins sobre instalação concluída
        const gestoresAdmins = await prisma.usuario.findMany({
          where: {
            perfil: { in: ['ADMIN', 'GESTOR'] },
            status: 'ATIVADO'
          },
          select: { id: true, cpf: true }
        });

        for (const user of gestoresAdmins) {
          await prisma.notificacao.create({
            data: {
              titulo: 'OS Aguardando Conclusão',
              mensagem: `OS de ${osExistente.cliente} precisa ser concluída`,
              tipo: 'OS_INSTALADA',
              destinatarioId: user.id,
              destinatarioCPF: user.cpf,
              lida: false,
              dadosExtras: {
                osId: parseInt(id),
                cliente: osExistente.cliente,
                cidade: osExistente.enderecoCidade
              }
            }
          });
        }

        console.log(`✅ Notificações de instalação criadas para ${gestoresAdmins.length} gestores/admins sobre OS ${id}`);
      }
    } catch (notifError) {
      console.error('Erro ao criar notificações:', notifError);
      // Não falha a atualização da OS se houver erro nas notificações
    }
    
    console.log(`✅ OS ${id} atualizada com sucesso para status: ${status}`);
    
    res.json({ success: true, ordemServico: osAtualizada });
    
  } catch (error) {
    console.error(`❌ Erro ao alterar status da OS ${req.params.id}:`, error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({ 
      error: 'Erro ao alterar status da OS',
      details: error.message,
      osId: req.params.id
    });
  }
});

app.get('/api/ordens-servico/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const ordem = await prisma.ordemservico.findUnique({
      where: { id: parseInt(id) },
      include: {
        criador: true,
        equipeVinculo: {
          include: {
            usuario: true
          }
        },
        instalacoes: true
      }
    });
    
    if (!ordem) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }
    
    res.json(ordem);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ******** ENDPOINTS DE INSTALAÇÕES ********

app.post('/api/instalacoes', authenticateToken, async (req, res) => {
  try {
    const dadosInstalacao = req.body;
    
    const novaInstalacao = await prisma.instalacao.create({
      data: {
        ...dadosInstalacao,
        operadorId: req.user.id,
        status: 'CONCLUIDA'
      }
    });
    
    res.json({ success: true, instalacao: novaInstalacao });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.patch('/api/instalacoes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;
    
    const instalacaoAtualizada = await prisma.instalacao.update({
      where: { id: parseInt(id) },
      data: dados
    });
    
    res.json({ success: true, instalacao: instalacaoAtualizada });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/instalacoes/andamento/:operadorId', authenticateToken, async (req, res) => {
  try {
    const { operadorId } = req.params;
    
    const instalacao = await prisma.instalacao.findFirst({
      where: {
        operadorId: parseInt(operadorId),
        status: 'EM_ANDAMENTO'
      },
      include: {
        ordemServico: true
      }
    });
    
    res.json(instalacao);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ✅ FUNÇÃO: Mapear dados do step para campos específicos da tabela instalacao
function mapearDadosStep(stepAtual, dadosInstalacao) {
  const dados = {};
  const agora = new Date();
  
  switch (parseInt(stepAtual)) {
    case 1: // Local e observação
      if (dadosInstalacao.step1) {
        dados.localSelecionado = dadosInstalacao.step1.local || null;
        dados.observacao = dadosInstalacao.step1.observacao || null;
        dados.dataHoraLocal = agora;
        dados.dataHoraObservacao = agora;
      }
      break;
      
    case 2: // Foto local (antes)
      if (dadosInstalacao.step2?.fotoLocalAntes) {
        dados.fotoAntesLink = dadosInstalacao.step2.fotoLocalAntes;
        dados.dataHoraFotoAntes = agora;
      }
      break;
      
    case 3: // Medição fluxo (antes)
      if (dadosInstalacao.step3?.fluxoAntes) {
        dados.fluxoAntes = parseFloat(dadosInstalacao.step3.fluxoAntes);
        dados.dataHoraFluxoAntes = agora;
      }
      break;
      
    case 4: // Foto medição (antes) + opção de dispensa
      if (dadosInstalacao.step4?.fotoMedicaoAntes) {
        dados.fotoFluxoAntesLink = dadosInstalacao.step4.fotoMedicaoAntes;
        dados.dataHoraFotoFluxoAntes = agora;
      }
      // ✅ NOVA FUNCIONALIDADE: Salvar motivo de dispensa no campo observacao
      if (dadosInstalacao.step4?.motivoDispensa) {
        dados.observacao = dadosInstalacao.step4.motivoDispensa;
      }
      break;
      
    case 5: // Seleção êmbolo
      if (dadosInstalacao.step5?.embolo) {
        dados.emboloSelecionado = dadosInstalacao.step5.embolo;
        dados.dataHoraEmbolo = agora;
      }
      break;
      
    case 6: // Seleção mola
      if (dadosInstalacao.step6?.mola) {
        dados.molaSelecionada = dadosInstalacao.step6.mola;
        dados.dataHoraMola = agora;
      }
      break;
      
    case 7: // Medição fluxo (depois)
      if (dadosInstalacao.step7?.fluxoDepois) {
        dados.fluxoDepois = parseFloat(dadosInstalacao.step7.fluxoDepois);
        dados.dataHoraFluxoDepois = agora;
      }
      break;
      
    case 8: // Foto medição (depois)
      if (dadosInstalacao.step8?.fotoMedicaoDepois) {
        dados.fotoFluxoDepoisLink = dadosInstalacao.step8.fotoMedicaoDepois;
        dados.dataHoraFotoFluxoDepois = agora;
      }
      break;
      
    case 9: // Lacre
      if (dadosInstalacao.step9?.lacre) {
        dados.lacre = dadosInstalacao.step9.lacre;
        dados.dataHoraLacre = agora;
      }
      break;
      
    case 10: // Foto lacre
      if (dadosInstalacao.step10?.fotoLacre) {
        dados.fotoLacreLink = dadosInstalacao.step10.fotoLacre;
        dados.dataHoraFotoLacre = agora;
      }
      break;
      
    case 11: // Foto local (depois)
      if (dadosInstalacao.step11?.fotoLocalDepois) {
        dados.fotoDepoisLink = dadosInstalacao.step11.fotoLocalDepois;
        dados.dataHoraFotoDepois = agora;
      }
      break;
      
    case 12: // Confirmação final
      if (dadosInstalacao.step12?.observacaoFinal) {
        // Mesclar observação final com observação existente
        dados.observacao = dadosInstalacao.step12.observacaoFinal;
        dados.dataHoraObservacao = agora;
      }
      break;
  }
  
  return dados;
}

// ✅ CORRIGIDO: Salvar progresso da instalação com campos específicos + STEP 1 DETECTION
app.post('/api/instalacoes/progresso', authenticateToken, async (req, res) => {
  try {
    const { 
      ordemServicoId, 
      stepAtual, 
      dadosEspecificos,
      operadorIniciou 
    } = req.body;

    console.log(`💾 Salvando progresso - OS#${ordemServicoId} - Step ${stepAtual} - Operador: ${req.user.nome}`);

    // ✅ NOVO: DETECTAR STEP 1 E ATUALIZAR STATUS OS
    if (parseInt(stepAtual) === 1) {
      console.log(`🚀 Step 1 detectado - Atualizando status OS#${ordemServicoId}: LIBERADA → INICIADA`);
      
      try {
        await prisma.ordemservico.update({
          where: { id: parseInt(ordemServicoId) },
          data: { status: 'INICIADA' }
        });
        console.log(`✅ Status OS#${ordemServicoId} atualizado para INICIADA`);
      } catch (statusError) {
        console.error(`❌ Erro ao atualizar status OS#${ordemServicoId}:`, statusError);
        // Continuar mesmo se não conseguir atualizar o status
      }
    }

    // ✅ NOVO: Verificar se o MESMO USUÁRIO já tem instalação em andamento para esta OS
    const instalacaoDoUsuario = await prisma.instalacao.findFirst({
      where: { 
        ordemServicoId: parseInt(ordemServicoId),
        operadorId: req.user.id,
        status: 'EM_ANDAMENTO'
      }
    });

    let instalacao;

    if (instalacaoDoUsuario) {
      // ✅ Atualizar instalação existente do MESMO USUÁRIO com dados específicos
      console.log(`🔄 Atualizando instalação existente - ID: ${instalacaoDoUsuario.id}`);
      console.log(`📋 Dados específicos para atualização:`, dadosEspecificos);
      
      instalacao = await prisma.instalacao.update({
        where: { id: instalacaoDoUsuario.id },
        data: {
          ultimoOperadorId: req.user.id,
          stepAtual: parseInt(stepAtual), // ✅ CORREÇÃO: Incluir stepAtual na atualização
          ...dadosEspecificos // ✅ Usar dados mapeados do frontend
        }
      });
      console.log(`✅ Progresso atualizado - Usuário ${req.user.nome} - ID ${instalacao.id} - Step ${stepAtual}`);
    } else {
      // ✅ STEP 1: Verificar se é nova instalação (operadorIniciou presente) e se usuário já tem outra em andamento
      if (parseInt(stepAtual) === 1 && operadorIniciou) {
        // Verificar se usuário já tem instalação em andamento nesta OS
        const instalacaoExistente = await prisma.instalacao.findFirst({
          where: { 
            ordemServicoId: parseInt(ordemServicoId),
            operadorId: req.user.id,
            status: 'EM_ANDAMENTO'
          }
        });

        if (instalacaoExistente) {
          return res.status(400).json({ 
            error: `A instalação ${instalacaoExistente.id} que você iniciou está parada no Step ${instalacaoExistente.stepAtual}. Finalize antes de iniciar uma nova instalação.`,
            instalacaoId: instalacaoExistente.id,
            stepAtual: instalacaoExistente.stepAtual
          });
        }
      }

      // ✅ Criar nova instalação com dados específicos do frontend
      console.log(`📋 Dados específicos recebidos:`, dadosEspecificos);
      
      instalacao = await prisma.instalacao.create({
        data: {
          ordemServicoId: parseInt(ordemServicoId),
          operadorId: operadorIniciou || req.user.id,
          ultimoOperadorId: req.user.id,
          status: 'EM_ANDAMENTO',
          stepAtual: parseInt(stepAtual), // ✅ CORREÇÃO: Incluir stepAtual na criação
          ...dadosEspecificos // ✅ Usar dados mapeados do frontend
        }
      });
      console.log(`✅ Nova instalação criada - Usuário ${req.user.nome} - ID ${instalacao.id} - Step ${stepAtual}`);
    }

    res.json({ 
      success: true, 
      instalacao: {
        id: instalacao.id,
        stepAtual: instalacao.stepAtual,
        localSelecionado: instalacao.localSelecionado,
        ultimaAtualizacao: instalacao.ultimaAtualizacao
      }
    });

  } catch (error) {
    console.error('❌ Erro ao salvar progresso:', error);
    res.status(500).json({ error: 'Erro ao salvar progresso da instalação' });
  }
});

// ✅ ATUALIZADO: Endpoint para atualizar progresso com campos específicos
app.patch('/api/instalacoes/progresso/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { stepAtual, dadosEspecificos } = req.body;

    console.log(`🔄 Atualizando progresso - ID ${id} - Step ${stepAtual} - Operador: ${req.user.nome}`);
    console.log(`📋 Dados específicos recebidos:`, dadosEspecificos);

    const instalacao = await prisma.instalacao.update({
      where: { id: parseInt(id) },
      data: {
        ultimoOperadorId: req.user.id,
        stepAtual: parseInt(stepAtual), // ✅ CORREÇÃO: Incluir stepAtual na atualização
        ...dadosEspecificos // ✅ Usar dados mapeados do frontend
      }
    });

    console.log(`✅ Progresso ID ${id} atualizado para Step ${stepAtual}`);

    res.json({ 
      success: true, 
      instalacao: {
        id: instalacao.id,
        stepAtual: instalacao.stepAtual,
        localSelecionado: instalacao.localSelecionado,
        ultimaAtualizacao: instalacao.ultimaAtualizacao
      }
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar progresso:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Instalação não encontrada' });
    }
    
    res.status(500).json({ error: 'Erro ao atualizar progresso da instalação' });
  }
});

// Carregar progresso da instalação
app.get('/api/instalacoes/progresso/:ordemServicoId', authenticateToken, async (req, res) => {
  try {
    const { ordemServicoId } = req.params;

    console.log(`📥 Carregando progresso - OS#${ordemServicoId}`);

    const progresso = await prisma.instalacao.findFirst({
      where: { 
        ordemServicoId: parseInt(ordemServicoId),
        status: 'EM_ANDAMENTO'
      },
      include: {
        operador: {
          select: { id: true, nome: true, sobrenome: true }
        },
        ultimoOperador: {
          select: { id: true, nome: true, sobrenome: true }
        },
        ordemServico: {
          select: { cliente: true, status: true }
        }
      }
    });

    if (!progresso) {
      console.log(`ℹ️ Nenhum progresso encontrado para OS#${ordemServicoId}`);
      return res.json({ progresso: null });
    }

    // Parse dos dados JSON
    let dadosInstalacao = {};
    if (progresso.dadosInstalacao) {
      try {
        dadosInstalacao = JSON.parse(progresso.dadosInstalacao);
      } catch (e) {
        console.error('❌ Erro ao parsear dados da instalação:', e);
      }
    }

    const tempoDecorrido = Math.floor((new Date() - new Date(progresso.dataHoraInicio)) / 1000 / 60);

    console.log(`✅ Progresso carregado - Step ${progresso.stepAtual} - Tempo: ${tempoDecorrido}min`);

    res.json({ 
      progresso: {
        id: progresso.id,
        stepAtual: progresso.stepAtual,
        dadosInstalacao,
        localSelecionado: progresso.localSelecionado,
        operadorIniciou: progresso.operador,
        ultimoOperador: progresso.ultimoOperador,
        ultimaAtualizacao: progresso.ultimaAtualizacao,
        tempoDecorrido
      }
    });

  } catch (error) {
    console.error('❌ Erro ao carregar progresso:', error);
    res.status(500).json({ error: 'Erro ao carregar progresso da instalação' });
  }
});

// Listar instalações em andamento de uma OS (para modal de seleção)
app.get('/api/instalacoes/andamento-os/:ordemServicoId', authenticateToken, async (req, res) => {
  try {
    const { ordemServicoId } = req.params;

    console.log(`📋 Listando instalações em andamento - OS#${ordemServicoId}`);

    const instalacoesAndamento = await prisma.instalacao.findMany({
      where: { 
        ordemServicoId: parseInt(ordemServicoId),
        status: 'EM_ANDAMENTO'
      },
      include: {
        operador: {
          select: { id: true, nome: true, sobrenome: true }
        },
        ultimoOperador: {
          select: { id: true, nome: true, sobrenome: true }
        }
      },
      orderBy: { ultimaAtualizacao: 'desc' }
    });

    const instalacoes = instalacoesAndamento.map(inst => {
      let dadosInstalacao = {};
      if (inst.dadosInstalacao) {
        try {
          dadosInstalacao = JSON.parse(inst.dadosInstalacao);
        } catch (e) {
          console.error('❌ Erro ao parsear dados:', e);
        }
      }

      const tempoDecorrido = Math.floor((new Date() - new Date(inst.dataHoraInicio)) / 1000 / 60);
      const proximoStep = inst.stepAtual + 1;

      return {
        id: inst.id,
        stepAtual: inst.stepAtual,
        proximoStep: proximoStep > 12 ? 'Finalização' : proximoStep,
        localSelecionado: inst.localSelecionado,
        operadorIniciou: inst.operador,
        ultimoOperador: inst.ultimoOperador,
        ultimaAtualizacao: inst.ultimaAtualizacao,
        tempoDecorrido,
        dadosBasicos: {
          fluxoAntes: dadosInstalacao.fluxoAntes,
          fluxoDepois: dadosInstalacao.fluxoDepois,
          embolo: dadosInstalacao.emboloSelecionado || dadosInstalacao.embolo,
          mola: dadosInstalacao.molaSelecionada || dadosInstalacao.mola
        }
      };
    });

    console.log(`✅ ${instalacoes.length} instalações em andamento encontradas`);

    res.json({ instalacoes });

  } catch (error) {
    console.error('❌ Erro ao listar instalações em andamento:', error);
    res.status(500).json({ error: 'Erro ao listar instalações em andamento' });
  }
});

// Deletar progresso de instalação (cancelar instalação)
app.delete('/api/instalacoes/progresso/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Cancelando instalação - ID ${id} - Operador: ${req.user.nome}`);

    // ✅ BUSCAR DADOS DA INSTALAÇÃO ANTES DE DELETAR
    const instalacao = await prisma.instalacao.findUnique({
      where: { id: parseInt(id) }
    });

    if (!instalacao) {
      return res.status(404).json({ error: 'Instalação não encontrada' });
    }

    const ordemServicoId = instalacao.ordemServicoId;

    // ✅ DELETAR A INSTALAÇÃO
    await prisma.instalacao.delete({
      where: { id: parseInt(id) }
    });

    // ✅ VERIFICAR SE AINDA EXISTEM INSTALAÇÕES PARA ESTA OS
    const outrasInstalacoes = await prisma.instalacao.count({
      where: { 
        ordemServicoId: ordemServicoId,
        status: 'EM_ANDAMENTO'
      }
    });

    console.log(`📊 Instalações restantes para OS#${ordemServicoId}: ${outrasInstalacoes}`);

    // ✅ SE NÃO EXISTEM OUTRAS INSTALAÇÕES, VOLTAR STATUS PARA LIBERADA
    if (outrasInstalacoes === 0) {
      await prisma.ordemservico.update({
        where: { id: ordemServicoId },
        data: { status: 'LIBERADA' }
      });
      console.log(`🔄 Status OS#${ordemServicoId} voltou para LIBERADA (sem instalações em andamento)`);
    } else {
      console.log(`ℹ️ OS#${ordemServicoId} mantém status INICIADA (ainda há ${outrasInstalacoes} instalações em andamento)`);
    }

    console.log(`✅ Instalação ${id} cancelada com sucesso`);

    res.json({ success: true });

  } catch (error) {
    console.error('❌ Erro ao deletar progresso:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Instalação não encontrada' });
    }
    
    res.status(500).json({ error: 'Erro ao deletar progresso da instalação' });
  }
});

// Finalizar instalação (mover de EM_ANDAMENTO para CONCLUIDA)
app.patch('/api/instalacoes/finalizar/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { dadosFinais, dispensada, motivoDispensa } = req.body;

    if (dispensada) {
      console.log(`🚫 Finalizando instalação DISPENSADA - ID ${id} - Operador: ${req.user.nome}`);
      console.log(`📝 Motivo: ${motivoDispensa}`);
    } else {
      console.log(`🏁 Finalizando instalação COMPLETA - ID ${id} - Operador: ${req.user.nome}`);
    }

    // Buscar instalação atual
    const instalacaoAtual = await prisma.instalacao.findUnique({
      where: { id: parseInt(id) }
    });

    if (!instalacaoAtual) {
      return res.status(404).json({ error: 'Instalação não encontrada' });
    }

    // Preparar dados para atualização
    let dadosCompletos = {};
    try {
      dadosCompletos = JSON.parse(instalacaoAtual.dadosInstalacao || '{}');
    } catch (e) {
      console.error('❌ Erro ao parsear dados existentes:', e);
    }

    // Definir step final baseado no tipo de finalização
    let stepFinal, observacaoFinal;
    
    if (dispensada) {
      // ✅ INSTALAÇÃO DISPENSADA: Manter step atual (4) e salvar motivo
      stepFinal = instalacaoAtual.stepAtual || 4;
      observacaoFinal = motivoDispensa || 'Instalação dispensada';
    } else {
      // ✅ INSTALAÇÃO COMPLETA: Step 12 e dados finais
      stepFinal = 12;
      const dadosMesclados = { ...dadosCompletos, ...dadosFinais };
      observacaoFinal = dadosMesclados.observacaoFinal;
    }

    const instalacao = await prisma.instalacao.update({
      where: { id: parseInt(id) },
      data: {
        status: 'CONCLUIDA',
        dataHoraFim: new Date(),
        ultimoOperadorId: req.user.id,
        stepAtual: stepFinal,
        observacao: observacaoFinal,
        dadosInstalacao: dispensada ? 
          JSON.stringify(dadosCompletos) : // Manter dados existentes para dispensadas
          JSON.stringify({ ...dadosCompletos, ...dadosFinais }) // Mesclar para completas
      }
    });

    const tipoFinalizacao = dispensada ? 'DISPENSADA' : 'COMPLETA';
    console.log(`✅ Instalação ${id} finalizada como ${tipoFinalizacao}`);

    res.json({ 
      success: true, 
      instalacao,
      tipo: tipoFinalizacao,
      motivo: dispensada ? motivoDispensa : null
    });

  } catch (error) {
    console.error('❌ Erro ao finalizar instalação:', error);
    res.status(500).json({ error: 'Erro ao finalizar instalação' });
  }
});

// ✅ NOVA: Verificar se OS pode ser encerrada (regra de negócio)
app.get('/api/instalacoes/verificar-encerramento/:ordemServicoId', authenticateToken, async (req, res) => {
  try {
    const { ordemServicoId } = req.params;
    console.log(`🔍 Verificando se OS#${ordemServicoId} pode ser encerrada`);
    
    const instalacoes = await prisma.instalacao.findMany({
      where: { ordemServicoId: parseInt(ordemServicoId) }
    });

    const finalizadas = instalacoes.filter(inst => inst.status === 'CONCLUIDA').length;
    const emAndamento = instalacoes.filter(inst => inst.status === 'EM_ANDAMENTO').length;
    const total = instalacoes.length;

    console.log(`📊 OS#${ordemServicoId}: ${total} total, ${finalizadas} finalizadas, ${emAndamento} em andamento`);

    // ✅ REGRA: Mínimo 1 CONCLUIDA + Nenhuma EM_ANDAMENTO
    const podeEncerrar = finalizadas >= 1 && emAndamento === 0;
    
    let motivo = '';
    if (finalizadas === 0) {
      motivo = 'Nenhuma instalação foi finalizada ainda.';
    } else if (emAndamento > 0) {
      motivo = `Ainda existem ${emAndamento} instalação(ões) em andamento.`;
    }

    const resultado = {
      podeEncerrar,
      motivo,
      finalizadas,
      emAndamento,
      total
    };

    console.log(`✅ Resultado verificação OS#${ordemServicoId}:`, resultado);
    res.json(resultado);

  } catch (error) {
    console.error('❌ Erro ao verificar encerramento:', error);
    res.status(500).json({ error: 'Erro ao verificar se OS pode ser encerrada' });
  }
});

// ✅ ENDPOINT: Relatório de Instalações (para RelatorioInstalacoes.jsx)
app.get('/api/instalacoes/relatorio', authenticateToken, async (req, res) => {
  try {
    console.log(`📊 Carregando relatório de instalações - Usuário: ${req.user.nome} (${req.user.perfil})`);
    
    // Buscar configuração de limite de dias
    const configLimite = await prisma.ConfiguracaoSistema.findUnique({
      where: { chave: 'inst_data_limite' }
    });
    
    const diasLimite = configLimite ? parseInt(configLimite.valor) : 90; // Padrão 90 dias
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasLimite);
    
    console.log(`📅 Filtrando instalações dos últimos ${diasLimite} dias (desde ${dataLimite.toLocaleDateString('pt-BR')})`);
    
    // Buscar instalações com filtro de data para performance
    const whereClause = {
      OR: [
        { status: 'EM_ANDAMENTO' }, // Sempre mostrar as em andamento
        { 
          AND: [
            { status: 'CONCLUIDA' },
            { dataHoraFim: { gte: dataLimite } } // Concluídas dentro do período
          ]
        }
      ]
    };
    
    const instalacoes = await prisma.instalacao.findMany({
      where: whereClause,
      include: {
        ordemServico: {
          include: {
            criador: true // Para pegar o nome do vendedor
          }
        },
        operador: true,
        ultimoOperador: true
      },
      orderBy: {
        id: 'desc'
      }
    });

    console.log(`📋 Encontradas ${instalacoes.length} instalações`);

    // Processar dados para o formato esperado pelo frontend
    const instalacoesProcessadas = instalacoes.map(instalacao => ({
      id: instalacao.id,
      ordemServicoId: instalacao.ordemServicoId,
      ordemServico: {
        id: instalacao.ordemServico.id,
        cliente: instalacao.ordemServico.cliente,
        vendedor: instalacao.ordemServico.criador?.nome || 'N/A'
      },
      localSelecionado: instalacao.localSelecionado,
      status: instalacao.status,
      stepAtual: instalacao.stepAtual,
      operador: instalacao.operador ? {
        id: instalacao.operador.id,
        nome: instalacao.operador.nome,
        cpf: instalacao.operador.cpf
      } : null,
      ultimoOperador: instalacao.ultimoOperador ? {
        id: instalacao.ultimoOperador.id,
        nome: instalacao.ultimoOperador.nome,
        cpf: instalacao.ultimoOperador.cpf
      } : null,
      emboloSelecionado: instalacao.emboloSelecionado,
      molaSelecionada: instalacao.molaSelecionada,
      fluxoAntes: instalacao.fluxoAntes,
      fluxoDepois: instalacao.fluxoDepois,
      dataHoraInicio: instalacao.dataHoraInicio,
      dataHoraFim: instalacao.dataHoraFim,
      ultimaAtualizacao: instalacao.ultimaAtualizacao,
      observacao: instalacao.observacao,
      dadosInstalacao: instalacao.dadosInstalacao
    }));

    res.json({
      success: true,
      instalacoes: instalacoesProcessadas,
      total: instalacoesProcessadas.length,
      filtro: {
        diasLimite: diasLimite,
        dataLimite: dataLimite.toISOString(),
        descricao: `Mostrando instalações em andamento e concluídas nos últimos ${diasLimite} dias`
      }
    });

  } catch (error) {
    console.error('❌ Erro ao carregar relatório de instalações:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao carregar relatório de instalações',
      message: error.message 
    });
  }
});

// ******** ENDPOINTS DE UPLOAD - CORRIGIDOS ********

app.post('/api/upload-foto', authenticateToken, upload.single('foto'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    
    console.log(`📸 Upload iniciado - Arquivo: ${file.originalname} - Tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    
    const contasGDrive = await buscarContasOAuth2Drive();
    if (contasGDrive.length === 0) {
      return res.status(500).json({ error: 'Nenhuma conta OAuth2 Google Drive configurada' });
    }
    
    let ultimoErro = null;

    // ✅ CORRIGIDO: Fallback entre múltiplas contas
    for (const conta of contasGDrive) {
      try {
        console.log(`📤 Tentando upload na conta: ${conta.chave}`);
        
        const linkFoto = await uploadToGoogleDriveOAuth2(file, conta);
        
        console.log(`✅ Upload bem-sucedido: ${linkFoto}`);
        
        return res.json({ 
          success: true, 
          url: linkFoto,
          conta_utilizada: conta.chave
        });
        
      } catch (error) {
        console.error(`❌ Erro na conta ${conta.chave}:`, error.message);
        ultimoErro = error;
        continue;
      }
    }
    
    throw ultimoErro || new Error('Todas as contas Google Drive falharam');
    
  } catch (error) {
    console.error('❌ Erro no upload:', error);
    res.status(500).json({ 
      error: 'Erro no upload da foto',
      details: error.message 
    });
  }
});

// ✅ FUNÇÃO: Renovar tokens OAuth2 automaticamente
async function renovarTokensOAuth2(contaConfig) {
  try {
    console.log(`🔄 Renovando tokens OAuth2 para conta: ${contaConfig.chave}`);
    
    // Criar cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      contaConfig.client_id,
      contaConfig.client_secret,
      "https://oms-blue-world-backend.up.railway.app/auth/callback"
    );
    
    // Configurar apenas o refresh_token
    oauth2Client.setCredentials({
      refresh_token: contaConfig.tokens.refresh_token
    });
    
    // Renovar tokens
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    console.log('✅ Tokens renovados com sucesso!');
    
    // Atualizar tokens no banco
    const novosTokens = {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || contaConfig.tokens.refresh_token, // Manter o refresh_token se não vier novo
      scope: credentials.scope || contaConfig.tokens.scope,
      token_type: credentials.token_type || contaConfig.tokens.token_type,
      expiry_date: credentials.expiry_date,
      status: 'ATIVA',
      ordem: 0,
      setup_complete: true
    };
    
    // Determinar chave correta para salvar os tokens
    let chaveTokens;
    if (contaConfig.chave === 'oauth_conta_1') {
      chaveTokens = 'oauth_tokens_conta_1';
    } else if (contaConfig.chave === 'oauth_conta_2') {
      chaveTokens = 'oauth_tokens_conta_2';
    } else {
      chaveTokens = 'oauth_tokens_conta_1'; // Fallback
    }
    
    // Salvar tokens renovados no banco
    await prisma.ConfiguracaoSistema.upsert({
      where: { chave: chaveTokens },
      update: { 
        valor: JSON.stringify(novosTokens),
        descricao: `Tokens OAuth2 renovados automaticamente - ${new Date().toLocaleString()}`
      },
      create: {
        chave: chaveTokens,
        valor: JSON.stringify(novosTokens),
        tipo: 'JSON',
        descricao: `Tokens OAuth2 renovados automaticamente - ${new Date().toLocaleString()}`
      }
    });
    
    console.log(`🎯 Tokens salvos no banco: ${chaveTokens}`);
    
    return novosTokens;
    
  } catch (error) {
    console.error('❌ Erro ao renovar tokens:', error.message);
    throw new Error(`Falha na renovação automática de tokens: ${error.message}`);
  }
}

// ✅ FUNÇÃO: Upload para Google Drive usando OAuth2
async function uploadToGoogleDriveOAuth2(file, contaConfig) {
  try {
    console.log(`📤 Upload OAuth2 na conta: ${contaConfig.chave}`);
    
    // Criar cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      contaConfig.client_id,
      contaConfig.client_secret,
      "https://oms-blue-world-backend.up.railway.app/auth/callback"
    );
    
    // Configurar tokens
    oauth2Client.setCredentials(contaConfig.tokens);
    
    // Criar serviço Drive
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Metadados do arquivo
    const fileMetadata = {
      name: `OMS_${Date.now()}_${file.originalname}`,
      parents: [contaConfig.folder_id || '1BqeQldczJ7pM3YkRlzHgBlkQYdU9hJzV'] // Usar folder_id da conta
    };
    
    // Upload do arquivo
    const response = await drive.files.create({
      resource: fileMetadata,
      media: {
        mimeType: file.mimetype,
        body: Buffer.from(file.buffer)
      },
      fields: 'id,name,webViewLink'
    });
    
    const fileId = response.data.id;
    
    // Tornar o arquivo público
    await drive.permissions.create({
      fileId: fileId,
      resource: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    // Gerar link direto para visualização
    const linkVisualizacao = `https://drive.google.com/file/d/${fileId}/view`;
    
    console.log(`✅ Upload OAuth2 concluído: ${linkVisualizacao}`);
    
    return linkVisualizacao;
    
  } catch (error) {
    console.error(`❌ Erro no upload OAuth2:`, error.message);
    
    // Se token expirou, tentar refresh automaticamente
    if (error.message.includes('invalid_grant') || error.message.includes('Token has been expired') || error.code === 401) {
      console.log('🔄 Token expirado, tentando renovação automática...');
      
      try {
        // Renovar tokens automaticamente
        const novosTokens = await renovarTokensOAuth2(contaConfig);
        
        // Configurar novos tokens no cliente
        oauth2Client.setCredentials(novosTokens);
        
        // Tentar o upload novamente com tokens renovados
        console.log('🔄 Tentando upload novamente com tokens renovados...');
        
        const response = await drive.files.create({
          resource: fileMetadata,
          media: {
            mimeType: file.mimetype,
            body: Buffer.from(file.buffer)
          },
          fields: 'id,name,webViewLink'
        });
        
        const fileId = response.data.id;
        
        // Tornar o arquivo público
        await drive.permissions.create({
          fileId: fileId,
          resource: {
            role: 'reader',
            type: 'anyone'
          }
        });
        
        // Gerar link direto para visualização
        const linkVisualizacao = `https://drive.google.com/file/d/${fileId}/view`;
        
        console.log(`✅ Upload OAuth2 concluído após renovação: ${linkVisualizacao}`);
        
        return linkVisualizacao;
        
      } catch (refreshError) {
        console.error('❌ Erro na renovação automática:', refreshError.message);
        throw new Error('Token OAuth2 expirado e não foi possível renovar automaticamente');
      }
    }
    
    throw error;
  }
}

// ✅ FUNÇÃO: Buscar contas OAuth2 para upload Drive
async function buscarContasOAuth2Drive() {
  try {
    console.log('🔍 Buscando contas OAuth2 Google Drive ativas...');
    
    const contasOAuth = await prisma.ConfiguracaoSistema.findMany({
      where: { 
        chave: { 
          in: [
            'oauth_tokens_conta_1', 'oauth_config_conta_1', 'oauth_client_id_conta_1', 'oauth_client_secret_conta_1',
            'oauth_tokens_conta_2', 'oauth_config_conta_2', 'oauth_client_id_conta_2', 'oauth_client_secret_conta_2'
          ]
        }
      }
    });

    console.log(`📋 Encontradas ${contasOAuth.length} configurações OAuth2 no banco`);

    const contasAtivas = [];
    
    // Verificar Conta 1
    const tokens1 = contasOAuth.find(c => c.chave === 'oauth_tokens_conta_1');
    const clientId1 = contasOAuth.find(c => c.chave === 'oauth_client_id_conta_1');
    const clientSecret1 = contasOAuth.find(c => c.chave === 'oauth_client_secret_conta_1');
    const config1 = contasOAuth.find(c => c.chave === 'oauth_config_conta_1');
    
    if (tokens1 && clientId1 && clientSecret1) {
      try {
        const tokens = JSON.parse(tokens1.valor);
        const configData = config1 ? JSON.parse(config1.valor) : {};
        
        if (tokens.access_token) {
          contasAtivas.push({
            chave: 'oauth_conta_1',
            client_id: clientId1.valor,
            client_secret: clientSecret1.valor,
            tokens: tokens,
            folder_id: configData.folder_id || '14ylGuzKzecQfeNgv9ICaiMP9hTJ5BFmY',
            ordem: 1
          });
          console.log('✅ Conta 1 OAuth2 ATIVA');
        }
      } catch (e) {
        console.error('❌ Erro ao parsear tokens conta 1:', e.message);
      }
    }

    // Verificar Conta 2
    const tokens2 = contasOAuth.find(c => c.chave === 'oauth_tokens_conta_2');
    const clientId2 = contasOAuth.find(c => c.chave === 'oauth_client_id_conta_2');
    const clientSecret2 = contasOAuth.find(c => c.chave === 'oauth_client_secret_conta_2');
    const config2 = contasOAuth.find(c => c.chave === 'oauth_config_conta_2');
    
    if (tokens2 && clientId2 && clientSecret2) {
      try {
        const tokens = JSON.parse(tokens2.valor);
        const configData = config2 ? JSON.parse(config2.valor) : {};
        
        if (tokens.access_token) {
          contasAtivas.push({
            chave: 'oauth_conta_2',
            client_id: clientId2.valor,
            client_secret: clientSecret2.valor,
            tokens: tokens,
            folder_id: configData.folder_id || '1pIQNORwS0vCST5xl8wZrntgUs46j-l1f',
            ordem: 2
          });
          console.log('✅ Conta 2 OAuth2 ATIVA');
        }
      } catch (e) {
        console.error('❌ Erro ao parsear tokens conta 2:', e.message);
      }
    }

    console.log(`📊 Total de contas OAuth2 ativas: ${contasAtivas.length}`);
    return contasAtivas;
    
  } catch (error) {
    console.error('❌ Erro ao buscar contas OAuth2 Drive:', error);
    return [];
  }
}

// ✅ FUNÇÃO: Buscar configurações OAuth2 com fallback de 2 contas
async function buscarConfigsOAuth2() {
  try {
    console.log('🔍 Buscando configurações OAuth2 para envio de email...');
    
    // Buscar todas as configurações OAuth2 (conta_1, conta_2, etc.)
    const configsOAuth = await prisma.ConfiguracaoSistema.findMany({
      where: { 
        chave: { 
          in: [
            'oauth_config_conta_1', 'oauth_tokens_conta_1', 'drive_folder_conta_1',
            'oauth_config_conta_2', 'oauth_tokens_conta_2', 'drive_folder_conta_2',
            // Fallback para configurações antigas
            'oauth_config', 'oauth_tokens', 'google_drive_folder_id'
          ]
        }
      }
    });
    
    console.log(`📋 Configurações encontradas: ${configsOAuth.map(c => c.chave).join(', ')}`);
    
    const contas = [];
    
    // ✅ CONTA 1 - Verificar configurações específicas primeiro
    const config1 = configsOAuth.find(c => c.chave === 'oauth_config_conta_1');
    const tokens1 = configsOAuth.find(c => c.chave === 'oauth_tokens_conta_1');
    const folder1 = configsOAuth.find(c => c.chave === 'drive_folder_conta_1');
    
    if (config1 && tokens1 && folder1) {
      try {
        contas.push({
          nome: 'Conta 1',
          ordem: 1,
          config: JSON.parse(config1.valor),
          tokens: JSON.parse(tokens1.valor),
          folderId: folder1.valor,
          chaveConfig: 'oauth_config_conta_1',
          chaveTokens: 'oauth_tokens_conta_1',
          chaveFolder: 'drive_folder_conta_1'
        });
        console.log('✅ Conta 1 OAuth2 configurada');
      } catch (e) {
        console.error('❌ Erro ao processar Conta 1:', e.message);
      }
    }
    
    // ✅ CONTA 2 - Segunda conta para fallback (pode não ter tokens ainda)
    const config2 = configsOAuth.find(c => c.chave === 'oauth_config_conta_2');
    const tokens2 = configsOAuth.find(c => c.chave === 'oauth_tokens_conta_2');
    const folder2 = configsOAuth.find(c => c.chave === 'drive_folder_conta_2');
    
    if (config2 && folder2) {
      contas.push({
        nome: 'Conta 2',
        ordem: 2,
        config: JSON.parse(config2.valor),
        tokens: tokens2 ? JSON.parse(tokens2.valor) : null,
        folderId: folder2.valor,
        chaveConfig: 'oauth_config_conta_2',
        chaveTokens: 'oauth_tokens_conta_2',
        chaveFolder: 'drive_folder_conta_2',
        precisaAuth: !tokens2 // Indica se precisa fazer auth primeiro
      });
      console.log(tokens2 ? '✅ Conta 2 OAuth2 configurada' : '⚠️ Conta 2 configurada (aguardando autorização)');
    }
    
    // ✅ FALLBACK - Configurações antigas (compatibilidade)
    if (contas.length === 0) {
      const configLegacy = configsOAuth.find(c => c.chave === 'oauth_config');
      const tokensLegacy = configsOAuth.find(c => c.chave === 'oauth_tokens');
      const folderLegacy = configsOAuth.find(c => c.chave === 'google_drive_folder_id');
      
      if (configLegacy && tokensLegacy && folderLegacy) {
        contas.push({
          nome: 'Conta Legacy',
          ordem: 999,
          config: JSON.parse(configLegacy.valor),
          tokens: JSON.parse(tokensLegacy.valor),
          folderId: folderLegacy.valor,
          chaveConfig: 'oauth_config',
          chaveTokens: 'oauth_tokens',
          chaveFolder: 'google_drive_folder_id'
        });
        console.log('⚠️ Usando configuração OAuth2 legacy');
      }
    }
    
    console.log(`📊 Total de contas OAuth2 disponíveis: ${contas.length}`);
    return contas;
    
  } catch (error) {
    console.error('❌ Erro ao buscar configurações OAuth2:', error);
    return [];
  }
}

// ✅ FUNÇÃO: Upload OAuth2 com fallback automático entre contas
async function uploadOAuth2ComFallback(file, osId, step, fotoTipo) {
  const contasOAuth = await buscarConfigsOAuth2();
  
  if (contasOAuth.length === 0) {
    throw new Error('Nenhuma configuração OAuth2 encontrada');
  }
  
  let ultimoErro = null;
  
  // Tentar upload em cada conta disponível
  for (const conta of contasOAuth.sort((a, b) => a.ordem - b.ordem)) {
    try {
      console.log(`📤 Tentando upload OAuth2 na ${conta.nome}...`);
      
      // ✅ Se conta precisa de autorização, gerar URL OAuth2
      if (conta.precisaAuth || !conta.tokens) {
        console.log(`⚠️ ${conta.nome} precisa de autorização OAuth2 - gerando URL...`);
        
        const oauth2Client = new google.auth.OAuth2(
          conta.config.client_id,
          conta.config.client_secret,
          conta.config.redirect_uris[0]
        );
        
        const authUrl = oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: ['https://www.googleapis.com/auth/drive.file'],
          state: `foto-upload-${conta.ordem}` // Para identificar qual conta
        });
        
        throw new Error(`Conta ${conta.nome} precisa de autorização. Acesse: ${authUrl}`);
      }
      
      // Configurar cliente OAuth2
      const oauth2Client = new google.auth.OAuth2(
        conta.config.client_id,
        conta.config.client_secret,
        conta.config.redirect_uri
      );
      
      oauth2Client.setCredentials(conta.tokens);
      
      // Verificar/renovar tokens se necessário
      if (conta.tokens.expiry_date && Date.now() > conta.tokens.expiry_date) {
        console.log(`⚠️ Token da ${conta.nome} expirado, renovando...`);
        
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          oauth2Client.setCredentials(credentials);
          
          // Salvar novos tokens
          await prisma.ConfiguracaoSistema.update({
            where: { chave: conta.chaveTokens },
            data: { valor: JSON.stringify(credentials) }
          });
          
          console.log(`✅ Tokens da ${conta.nome} renovados automaticamente`);
        } catch (renewError) {
          console.log(`❌ Erro ao renovar tokens da ${conta.nome}:`, renewError.message);
          ultimoErro = renewError;
          continue; // Tentar próxima conta
        }
      }
      
      // Fazer upload no Google Drive
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const filename = `OS${osId}_Step${step}_${fotoTipo}_${Date.now()}.jpg`;
      const uploadStart = Date.now();
      
      // Converter buffer para stream
      const { Readable } = require('stream');
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      
      const response = await drive.files.create({
        requestBody: { 
          name: filename,
          parents: [conta.folderId] 
        },
        media: { 
          mimeType: 'image/jpeg', 
          body: bufferStream 
        }
      });
      
      // Configurar permissões públicas
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: { role: 'reader', type: 'anyone' }
      });
      
      const uploadTime = Date.now() - uploadStart;
      const photoUrl = `https://drive.google.com/uc?id=${response.data.id}`;
      
      console.log(`✅ Upload OAuth2 realizado com sucesso na ${conta.nome}!`);
      console.log(`   📁 ID: ${response.data.id}`);
      console.log(`   🔗 URL: ${photoUrl}`);
      console.log(`   ⏱️ Tempo: ${uploadTime}ms`);
      
      return {
        success: true,
        photoUrl,
        url: photoUrl,
        driveId: response.data.id,
        uploadTime,
        method: 'oauth2',
        contaUtilizada: conta.nome
      };
      
    } catch (error) {
      console.error(`❌ Erro na ${conta.nome}:`, error.message);
      ultimoErro = error;
      
      // Log específico para diferentes tipos de erro
      if (error.message.includes('quota') || error.message.includes('storage')) {
        console.log(`💾 ${conta.nome}: Quota/Storage excedido - Tentando próxima conta`);
      } else if (error.code === 403) {
        console.log(`🔒 ${conta.nome}: Acesso negado - Tentando próxima conta`);
      } else if (error.code === 401) {
        console.log(`🔑 ${conta.nome}: Token inválido - Tentando próxima conta`);
      }
      
      continue; // Tentar próxima conta
    }
  }
  
  // Se chegou aqui, todas as contas falharam
  throw ultimoErro || new Error(`Todas as ${contasOAuth.length} contas OAuth2 falharam`);
}

// ✅ ENDPOINT: Upload usando OAuth2 com fallback automático de 2 contas
app.post('/api/upload-foto-gdrive', authenticateToken, upload.single('foto'), async (req, res) => {
  try {
    const { file } = req;
    const { osId, step, fotoTipo } = req.body;
    
    if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    
    console.log(`📸 Upload OAuth2 com fallback iniciado - OS#${osId} - Step ${step} - Tipo: ${fotoTipo} - Arquivo: ${file.originalname}`);
    
    // ✅ DEBUG: Verificar configurações OAuth disponíveis
    const contasDebug = await buscarConfigsOAuth2();
    console.log(`🔍 DEBUG - Contas OAuth2 encontradas: ${contasDebug.length}`);
    contasDebug.forEach((conta, i) => {
      console.log(`   Conta ${i+1}: ${conta.nome} - Client ID: ${conta.config?.client_id?.substring(0,20)}...`);
    });
    
    // Tentar upload com fallback automático entre contas
    const resultado = await uploadOAuth2ComFallback(file, osId, step, fotoTipo);
    
    res.json(resultado);
    
  } catch (error) {
    console.error('❌ Erro no upload OAuth2 com fallback:', error);
    
    // Verificar se é erro de autorização para gerar URL OAuth
    if (error.message.includes('Token') || error.code === 401) {
      try {
        // ✅ CORRIGIDO: Para FormData, usar req.body diretamente
        const osId = req.body.osId;
        const step = req.body.step;
        
        const contasOAuth = await buscarConfigsOAuth2();
        if (contasOAuth.length > 0) {
          const conta = contasOAuth[0]; // Usar primeira conta para autorização
          
          const oauth2Client = new google.auth.OAuth2(
            conta.config.client_id,
            conta.config.client_secret,
            conta.config.redirect_uri
          );
          
          const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/drive.file'],
            state: `instalacao-${osId}-step-${step}`
          });
          
          return res.status(401).json({ 
            error: 'Autorização OAuth necessária',
            authUrl,
            message: `Clique no link para autorizar upload de fotos (${conta.nome})`
          });
        }
      } catch (authError) {
        console.error('❌ Erro ao gerar URL OAuth:', authError);
      }
    }
    
    res.status(500).json({ 
      error: 'Erro no upload OAuth2 com fallback', 
      details: error.message 
    });
  }
});

// ******** ✅ NOVOS ENDPOINTS DEBUG ADMIN ********

// Status das contas Google Drive (apenas ADMIN)
app.get('/api/gdrive/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito ao perfil ADMIN' });
    }

    console.log(`🔍 Admin ${req.user.nome} consultando status das contas Google Drive`);

    const contas = await prisma.ConfiguracaoSistema.findMany({
      where: { chave: { startsWith: 'gdrive_conta_' } },
      orderBy: { chave: 'asc' }
    });

    const statusContas = contas.map(conta => {
      try {
        const config = JSON.parse(conta.valor);
        return {
          chave: conta.chave,
          status: config.status || 'N/A',
          ordem: config.ordem || 999,
          folder_id: config.folder_id || 'N/A',
          email: config.service_account_key?.client_email || 'N/A',
          configurada: !!config.service_account_key
        };
      } catch (e) {
        return {
          chave: conta.chave,
          status: 'ERRO_PARSE',
          erro: e.message
        };
      }
    });

    console.log(`✅ Status de ${statusContas.length} contas retornado`);

    res.json({ 
      success: true, 
      contas: statusContas,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro ao buscar status das contas:', error);
    res.status(500).json({ error: 'Erro ao buscar status das contas Google Drive' });
  }
});

// Reativar conta CHEIA (apenas ADMIN)
app.patch('/api/gdrive/reativar/:chave', authenticateToken, async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito ao perfil ADMIN' });
    }

    const { chave } = req.params;

    console.log(`🔄 Admin ${req.user.nome} reativando conta Google Drive: ${chave}`);

    const conta = await prisma.ConfiguracaoSistema.findUnique({
      where: { chave }
    });

    if (!conta) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    let config;
    try {
      config = JSON.parse(conta.valor);
    } catch (e) {
      return res.status(400).json({ error: 'Erro ao parsear configuração da conta' });
    }

    // Reativar conta
    config.status = 'ATIVA';

    await prisma.ConfiguracaoSistema.update({
      where: { chave },
      data: { valor: JSON.stringify(config) }
    });

    console.log(`✅ Conta ${chave} reativada com sucesso`);

    res.json({ 
      success: true, 
      message: `Conta ${chave} reativada com sucesso`,
      conta: {
        chave,
        status: config.status,
        ordem: config.ordem
      }
    });

  } catch (error) {
    console.error('❌ Erro ao reativar conta:', error);
    res.status(500).json({ error: 'Erro ao reativar conta Google Drive' });
  }
});

// ******** ENDPOINT FINALIZAR OS ********

app.post('/api/ordens-servico/:id/finalizar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { emailsExtras = '' } = req.body;
    
    console.log(`📧 Finalizando OS#${id} - Emails extras: "${emailsExtras}"`);
    
    const ordem = await prisma.ordemservico.findUnique({ 
      where: { id: Number(id) }, 
      include: { 
        instalacoes: { 
          where: { status: 'CONCLUIDA' },
          orderBy: { dataHoraFim: 'desc' }
        } 
      } 
    });
    
    if (!ordem || ordem.status !== "INSTALADA") {
      return res.status(400).json({ error: "OS não está pronta para ser finalizada" });
    }
    
    if (!ordem.email) {
      return res.status(400).json({ error: "Email do cliente não cadastrado" });
    }
    
    const instalacoes = ordem.instalacoes;
    if (!instalacoes || instalacoes.length === 0) {
      return res.status(400).json({ error: "Dados de instalação não encontrados" });
    }
    
    console.log(`📄 Gerando relatório PREMIUM PARA OS para ${instalacoes.length} instalações...`);
    
    let htmlContent, linkAcesso, corpoEmail, nomeArquivo;
    try {
      const resultado = await gerarRelatorioParaOS(ordem, instalacoes, 'completo');
      htmlContent = resultado.htmlContent;
      linkAcesso = resultado.linkAcesso;
      corpoEmail = resultado.corpoEmail;
      nomeArquivo = resultado.dadosResumo.nomeArquivo || `OS_${ordem.id}_${ordem.cliente}`;
      console.log(`✅ Relatório PREMIUM gerado com sucesso: ${nomeArquivo}`);
      console.log(`🔗 Link de acesso: ${linkAcesso}`);
      
      // ✅ SALVAR HTML NA TABELA DEDICADA relatorios_html
      const urlRelatorio = `${process.env.BACKEND_URL || 'https://oms-blue-world-backend.up.railway.app'}/relatorio?os=${id}`;
      
      await prisma.relatorios_html.upsert({
        where: { osId: Number(id) },
        update: { 
          htmlContent: htmlContent,
          urlRelatorio: urlRelatorio,
          updatedAt: new Date()
        },
        create: {
          osId: Number(id),
          clienteNome: ordem.cliente,
          htmlContent: htmlContent,
          urlRelatorio: urlRelatorio
        }
      });
      console.log(`💾 HTML salvo na tabela relatorios_html para OS #${id}`);
      
    } catch (htmlError) {
      console.error(`❌ Erro ao gerar relatório premium:`, htmlError);
      return res.status(400).json({ error: `Erro ao gerar relatório premium: ${htmlError.message}` });
    }
    
    
    // ✅ MONTAR LISTA COMPLETA DE DESTINATÁRIOS
    const destinatarios = [];
    
    // 1. Email do cliente (obrigatório)
    destinatarios.push(ordem.email);
    
    // 2. Emails padrão do sistema (dest_padrao)
    try {
      const emailsPadrao = await prisma.ConfiguracaoSistema.findUnique({
        where: { chave: 'dest_padrao' }
      });
      
      if (emailsPadrao?.valor) {
        const emailsList = emailsPadrao.valor.split(',').map(email => email.trim()).filter(email => email);
        destinatarios.push(...emailsList);
        console.log(`📋 Emails padrão encontrados: ${emailsList.join(', ')}`);
      }
    } catch (err) {
      console.warn('⚠️ Erro ao buscar emails padrão:', err.message);
    }
    
    // 3. Emails extras digitados pelo usuário
    if (emailsExtras.trim()) {
      const emailsExtrasList = emailsExtras.split(',').map(email => email.trim()).filter(email => email);
      destinatarios.push(...emailsExtrasList);
      console.log(`✏️ Emails extras: ${emailsExtrasList.join(', ')}`);
    }
    
    // Remover duplicatas
    const destinatariosUnicos = [...new Set(destinatarios)];
    console.log(`📤 Enviando para ${destinatariosUnicos.length} destinatários: ${destinatariosUnicos.join(', ')}`);
    
    // ✅ ENVIAR EMAIL COM TEMPLATE BLUEWORLD
    let emailEnviado = false;
    try {
      // Calcular métricas para o email
      const quantidadeInstalacoes = instalacoes.length;
      const reducaoMedia = quantidadeInstalacoes > 0 ? 
        instalacoes.reduce((sum, inst) => {
          const fluxoAntes = parseFloat(inst.fluxoAntes) || 0;
          const fluxoDepois = parseFloat(inst.fluxoDepois) || 0;
          const reducao = fluxoAntes > 0 ? ((fluxoAntes - fluxoDepois) / fluxoAntes) * 100 : 0;
          return sum + reducao;
        }, 0) / quantidadeInstalacoes : 0;
      
      // Calcular economia total de litros em 365 dias com 3h de uso diário
      const fluxoAntesTotal = instalacoes.reduce((sum, inst) => sum + (parseFloat(inst.fluxoAntes) || 0), 0);
      const fluxoDepoisTotal = instalacoes.reduce((sum, inst) => sum + (parseFloat(inst.fluxoDepois) || 0), 0);
      const economiaLitrosMinuto = fluxoAntesTotal - fluxoDepoisTotal;
      
      // Constante: Litros economizados em 365 dias (3h uso/dia) - VALOR ANUAL
      const economiaLitros365Dias = economiaLitrosMinuto * 60 * 3 * 365; // L/min * 60min/h * 3h/dia * 365dias
      
      // ROI Previsto/ano: economiaLitros365dias * (0.45/100) - R$ 0,45 para cada 100 litros - VALOR ANUAL
      const roiPrevistoAno = economiaLitros365Dias * (0.45 / 100);
      
      // Adicionar métricas à ordem para o template
      const ordemComMetricas = {
        ...ordem,
        quantidadeInstalacoes,
        reducaoMedia,
        economiaLitros365Dias: Math.round(economiaLitros365Dias),
        economiaAnual: roiPrevistoAno, // ROI Previsto/ano em R$
        economiaLitrosMinuto: economiaLitrosMinuto.toFixed(2)
      };
      
      // Gerar template BlueWorld
      const templateBlueWorld = gerarTemplateEmailBlueWorld(ordemComMetricas, linkAcesso);
      
      for (const destinatario of destinatariosUnicos) {
        await enviarEmailGmail(
          destinatario, 
          `✅ Instalação BlueWorld Finalizada - OS #${id} - ${ordem.cliente}`, 
          templateBlueWorld  // Template BlueWorld com "Relatório de Serviço"
        );
      }
      console.log(`✅ Email BlueWorld enviado com sucesso para todos os destinatários`);
      console.log(`🔗 Relatório disponível em: ${linkAcesso}`);
      emailEnviado = true;
    } catch (emailError) {
      console.error('❌ Erro ao enviar email premium:', emailError);
      console.error('❌ Stack trace completo:', emailError.stack);
      
      // ❌ CRÍTICO: Não mudar status da OS se email falhar
      return res.status(400).json({ 
        error: 'Erro ao enviar email premium com link', 
        details: emailError.message,
        motivo: 'Gmail não autorizado ou sem permissão gmail.send'
      });
    }
    
    /* ===== VERSÃO ANTERIOR COM HTML NO CORPO (COMENTADA) =====
    // ✅ ENVIAR EMAIL PARA TODOS OS DESTINATÁRIOS
    let emailEnviado = false;
    try {
      for (const destinatario of destinatariosUnicos) {
        await enviarEmailGmail(
          destinatario, 
          `✅ Instalação Finalizada - OS #${id} - ${ordem.cliente}`, 
          htmlContent  // Enviando o HTML completo no corpo
        );
      }
      console.log(`✅ Email enviado com sucesso para todos os destinatários`);
      emailEnviado = true;
    } catch (emailError) {
      console.error('❌ Erro ao enviar email:', emailError);
      console.error('❌ Stack trace completo:', emailError.stack);
      
      // ❌ CRÍTICO: Não mudar status da OS se email falhar
      return res.status(400).json({ 
        error: 'Erro ao gerar relatório e enviar email', 
        details: emailError.message,
        motivo: 'Gmail não autorizado ou sem permissão gmail.send'
      });
    }
    ===== FIM DA VERSÃO ANTERIOR ===== */
    
    // ✅ APENAS se email foi enviado com sucesso
    if (emailEnviado) {
      await prisma.ordemservico.update({ where: { id: Number(id) }, data: { status: "CONCLUIDA" } });
      
      // ✅ Marcar todas as notificações da OS como lidas para todos os gerentes
      try {
        console.log(`🔔 Marcando notificações da OS ${id} como lidas para todos os gerentes (finalização)`);
        
        // Buscar todos os gerentes ativos
        const gestores = await prisma.usuario.findMany({
          where: {
            perfil: { in: ['ADMIN', 'GESTOR'] },
            status: 'ATIVADO'
          },
          select: { id: true }
        });
        
        const gestorIds = gestores.map(g => g.id);
        
        // Marcar todas as notificações relacionadas à OS como lidas para todos os gerentes
        const resultLidas = await prisma.notificacao.updateMany({
          where: {
            dadosExtras: {
              path: ['osId'],
              equals: parseInt(id)
            },
            destinatarioId: { in: gestorIds },
            lida: false
          },
          data: { lida: true }
        });
        
        console.log(`✅ ${resultLidas.count} notificações da OS ${id} marcadas como lidas para todos os gerentes (finalização)`);
      } catch (notifLidaError) {
        console.error('Erro ao marcar notificações como lidas na finalização:', notifLidaError);
        // Não falha a operação se houver erro ao marcar como lidas
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Relatório premium enviado com sucesso',
      destinatarios: destinatariosUnicos,
      linkRelatorio: linkAcesso,
      nomeArquivo: nomeArquivo
    });
  } catch (error) {
    console.error('❌ Erro ao finalizar OS:', error);
    res.status(500).json({ error: 'Erro ao finalizar OS', details: error.message });
  }
});

// ******** ENDPOINTS DE RELATÓRIOS GERADOS ********

app.get('/api/relatorios-gerados', authenticateToken, async (req, res) => {
  try {
    // Verificar se o usuário é ADMIN ou GESTOR
    if (!['ADMIN', 'GESTOR'].includes(req.user.perfil)) {
      return res.status(403).json({ error: 'Acesso negado. Apenas ADMIN e GESTOR podem acessar relatórios gerados.' });
    }

    // Buscar todas as OS concluídas com relatório gerado
    const relatorios = await prisma.ordemservico.findMany({
      where: {
        status: 'CONCLUIDA',
        updatedAt: { not: null }
      },
      select: {
        id: true,
        cliente: true,
        updatedAt: true,
        dataCriacao: true,
        endereco: true,
        usuario: {
          select: {
            nome: true,
            perfil: true
          }
        },
        instalacoes: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Processar dados para incluir link do relatório
    const relatoriosProcessados = relatorios.map(os => {
      const dataFinalizacao = new Date(os.updatedAt);
      const dia = String(dataFinalizacao.getDate()).padStart(2, '0');
      const mes = String(dataFinalizacao.getMonth() + 1).padStart(2, '0');
      const ano = dataFinalizacao.getFullYear();
      const clienteFormatado = os.cliente.toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '');
      
      const nomeArquivo = `${os.id}_${clienteFormatado}_${dia}${mes}${ano}.html`;
      const linkRelatorio = `/relatorios/${nomeArquivo}`;
      
      return {
        id: os.id,
        cliente: os.cliente,
        dataFinalizacao: dataFinalizacao.toISOString(),
        dataFinalizacaoFormatada: dataFinalizacao.toLocaleDateString('pt-BR'),
        linkRelatorio,
        nomeArquivo,
        endereco: os.endereco,
        responsavel: os.usuario?.nome || 'N/A',
        perfilResponsavel: os.usuario?.perfil || 'N/A',
        totalInstalacoes: os.instalacoes?.length || 0,
        dataCriacao: os.dataCriacao
      };
    });

    console.log(`📊 Listando ${relatoriosProcessados.length} relatórios gerados para ${req.user.perfil}`);
    
    res.json({
      success: true,
      relatorios: relatoriosProcessados,
      total: relatoriosProcessados.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar relatórios gerados:', error);
    res.status(500).json({ error: 'Erro ao listar relatórios gerados', details: error.message });
  }
});

// ******** ENDPOINT PARA ONEPAGE REPORTS ********

app.get('/api/relatorios-html', authenticateToken, async (req, res) => {
  try {
    console.log(`🔍 OnePageReports - Requisição recebida de ${req.headers['user-agent']?.substring(0, 50)}`);
    console.log(`🔍 OnePageReports - Authorization header: ${req.headers.authorization ? 'presente' : 'ausente'}`);
    console.log(`🔍 OnePageReports - Usuário autenticado: ${req.user?.nome} (${req.user?.perfil})`);
    
    // Verificar se o usuário é ADMIN ou GESTOR
    if (!['ADMIN', 'GESTOR'].includes(req.user.perfil)) {
      console.log(`❌ OnePageReports - Acesso negado para perfil: ${req.user.perfil}`);
      return res.status(403).json({ error: 'Acesso negado. Apenas ADMIN e GESTOR podem acessar relatórios HTML.' });
    }

    console.log(`📊 OnePageReports - Buscando relatórios HTML para usuário ${req.user.perfil} - ${req.user.nome}`);

    // Buscar todos os relatórios HTML da tabela dedicada
    const relatorios = await prisma.relatorios_html.findMany({
      orderBy: {
        dataGeracao: 'desc'
      }
    });

    console.log(`✅ OnePageReports - Encontrados ${relatorios.length} relatórios HTML`);
    console.log(`📋 OnePageReports - Primeiros IDs: ${relatorios.slice(0, 3).map(r => r.id).join(', ')}`);
    
    res.setHeader('Content-Type', 'application/json');
    res.json(relatorios);
    
  } catch (error) {
    console.error('❌ Erro ao buscar relatórios HTML:', error);
    res.status(500).json({ error: 'Erro ao buscar relatórios HTML', details: error.message });
  }
});

// ******** ENDPOINTS DE ESTATÍSTICAS ********

app.get('/api/estatisticas', authenticateToken, async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const semanaAtras = new Date();
    semanaAtras.setDate(semanaAtras.getDate() - 7);
    
    const [
      osAbertas, 
      osAndamento, 
      osFinalizadas, 
      usuariosAtivos,
      instalacoesHoje,
      osFinalizadasSemana,
      totalInstalacoes
    ] = await Promise.all([
      prisma.ordemservico.count({ where: { status: 'ABERTA' } }),
      prisma.ordemservico.count({ where: { status: { in: ['LIBERADA', 'INICIADA', 'INSTALADA'] } } }),
      prisma.ordemservico.count({ where: { status: 'CONCLUIDA' } }),
      prisma.usuario.count({ where: { status: 'ATIVADO' } }),
      prisma.ordemservico.count({ 
        where: { 
          status: 'INICIADA',
          dataCriacao: { gte: new Date(hoje) }
        }
      }),
      prisma.ordemservico.count({
        where: {
          status: 'CONCLUIDA',
          dataCriacao: { gte: semanaAtras }
        }
      }),
      prisma.instalacao.count({ where: { status: 'CONCLUIDA' } })
    ]);
    
    res.json({ 
      osAbertas, 
      osAndamento, 
      osFinalizadas, 
      usuariosAtivos,
      instalacoesHoje,
      osFinalizadasSemana,
      totalInstalacoes
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ******** ENDPOINTS DE LOGS ********

app.get('/api/logs-acesso', authenticateToken, async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const logs = await prisma.LogAcesso.findMany({
      include: {
        usuario: {
          select: { nome: true, sobrenome: true, cpf: true }
        }
      },
      orderBy: { dataHora: 'desc' },
      take: 1000
    });
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.delete('/api/logs-acesso', authenticateToken, async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs dos logs são obrigatórios' });
    }
    
    await prisma.LogAcesso.deleteMany({
      where: { id: { in: ids } }
    });
    
    res.json({ success: true, deletedCount: ids.length });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/validar-log-key', authenticateToken, async (req, res) => {
  try {
    const { senha } = req.body;
    
    const config = await prisma.ConfiguracaoSistema.findUnique({
      where: { chave: 'key_log' }
    });
    
    if (!config || config.valor !== senha) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ******** ENDPOINTS DE CONFIGURAÇÕES ********

// Endpoint para SistemaConfiguracoes.jsx
app.get('/api/configuracoes', authenticateToken, async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const configuracoes = await prisma.ConfiguracaoSistema.findMany({
      orderBy: { chave: 'asc' }
    });
    
    res.json(configuracoes);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para ConfiguracoesEmpresa.jsx
app.get('/api/configuracoes-sistema', authenticateToken, async (req, res) => {
  try {
    if (!['ADMIN', 'GESTOR'].includes(req.user.perfil)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const configuracoes = await prisma.ConfiguracaoSistema.findMany({
      orderBy: { chave: 'asc' }
    });
    
    res.json(configuracoes);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoints CRUD para SistemaConfiguracoes.jsx
app.post('/api/configuracoes', authenticateToken, async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { chave, valor, tipo, descricao } = req.body;
    
    const config = await prisma.ConfiguracaoSistema.create({
      data: { chave, valor, tipo, descricao }
    });
    
    res.json({ success: true, configuracao: config });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Chave já existe' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.put('/api/configuracoes/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { id } = req.params;
    const { valor, tipo, descricao } = req.body;
    
    const config = await prisma.ConfiguracaoSistema.update({
      where: { id: parseInt(id) },
      data: { valor, tipo, descricao }
    });
    
    res.json({ success: true, configuracao: config });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.delete('/api/configuracoes/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { id } = req.params;
    
    await prisma.ConfiguracaoSistema.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoints para ConfiguracoesEmpresa.jsx
app.post('/api/configuracoes-sistema', authenticateToken, async (req, res) => {
  try {
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const { chave, valor, descricao } = req.body;
    
    const config = await prisma.configuracaoSistema.upsert({
      where: { chave },
      update: { valor, descricao },
      create: { chave, valor, descricao }
    });
    
    res.json({ success: true, configuracao: config });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/configuracao/:chave', authenticateToken, async (req, res) => {
  try {
    const { chave } = req.params;
    
    // Permitir acesso ao tempo_logout_automatico (é seguro)
    if (chave === 'tempo_logout_automatico') {
      const valor = await getConfiguracaoSistema(chave);
      
      if (valor === null) {
        return res.status(404).json({ error: 'Configuração não encontrada na tabela configuracaoSistema' });
      }
      
      return res.json({ chave, valor });
    }
    
    // Bloquear acesso a configurações sensíveis
    if (chave.toLowerCase().includes('senha') || 
        chave.toLowerCase().includes('token') || 
        chave.toLowerCase().includes('key')) {
      return res.status(403).json({ error: 'Acesso negado a esta configuração' });
    }

    const valor = await getConfiguracaoSistema(chave);
    
    if (valor === null) {
      return res.status(404).json({ error: 'Configuração não encontrada na tabela configuracaoSistema' });
    }

    res.json({ chave, valor });
  } catch (error) {
    console.error(`❌ Erro ao buscar configuração ${req.params.chave}:`, error);
    res.status(500).json({ error: 'Erro ao buscar configuração' });
  }
});

// ✅ ENDPOINT: Status das contas OAuth2 Google (removido - duplicado abaixo)

// ✅ ENDPOINT: Gerar URL autorização Gmail para conta específica
app.post('/api/oauth/gmail-auth/:conta', authenticateToken, async (req, res) => {
  try {
    // Apenas ADMIN pode autorizar contas
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas ADMIN pode autorizar contas OAuth2' });
    }

    const { conta } = req.params; // conta_1 ou conta_2
    
    console.log(`📧 Gerando URL autorização Gmail para ${conta}...`);
    
    // Buscar configuração da conta
    const configConta = await prisma.ConfiguracaoSistema.findUnique({
      where: { chave: `oauth_config_${conta}` }
    });
    
    if (!configConta) {
      return res.status(404).json({ 
        error: `Conta ${conta} não configurada. Configure primeiro via upload JSON.` 
      });
    }
    
    const config = JSON.parse(configConta.valor);
    
    // Criar cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      config.client_id,
      config.client_secret,
      "https://oms-blue-world-backend.up.railway.app/auth/callback"
    );
    
    // Gerar URL com escopos para Drive + Gmail
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.file',    // Upload fotos
        'https://www.googleapis.com/auth/gmail.send'     // Envio emails
      ],
      state: `gmail-auth-${conta}`, // Para identificar no callback
      prompt: 'consent' // Força re-autorização para obter novos escopos
    });
    
    console.log(`✅ URL gerada para ${conta}: ${authUrl}`);
    
    res.json({
      success: true,
      authUrl,
      conta,
      message: `Clique no link para autorizar Gmail + Drive para ${conta.replace('_', ' ')}`
    });
    
  } catch (error) {
    console.error('❌ Erro ao gerar URL Gmail:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar URL de autorização Gmail',
      details: error.message 
    });
  }
});

// ******** NOVOS ENDPOINTS PARA CONFIGURAÇÃO OAUTH2 ********

// Endpoint para atualizar status das contas OAuth2 (modificado)
app.get('/api/oauth/status', authenticateToken, async (req, res) => {
  try {
    // Apenas ADMIN pode ver status das contas
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas ADMIN pode acessar status OAuth2' });
    }

    console.log('📊 Consultando status das contas OAuth2...');
    
    const configsOAuth = await prisma.ConfiguracaoSistema.findMany({
      where: { 
        chave: { 
          in: [
            'oauth_client_id_conta_1', 'oauth_client_secret_conta_1', 'oauth_tokens_conta_1',
            'oauth_client_id_conta_2', 'oauth_client_secret_conta_2', 'oauth_tokens_conta_2'
          ]
        }
      }
    });

    const contas = {};

    // CONTA 1
    const clientId1 = configsOAuth.find(c => c.chave === 'oauth_client_id_conta_1');
    const clientSecret1 = configsOAuth.find(c => c.chave === 'oauth_client_secret_conta_1');
    const tokens1 = configsOAuth.find(c => c.chave === 'oauth_tokens_conta_1');
    
    contas.conta_1 = {
      client_id: clientId1?.valor || '',
      client_secret: clientSecret1?.valor || '',
      email: 'conta1@gmail.com', // Placeholder
      status: (clientId1 && clientSecret1 && tokens1) ? 'ativo' : 
              (clientId1 && clientSecret1) ? 'configurado' : 'pendente'
    };

    // CONTA 2
    const clientId2 = configsOAuth.find(c => c.chave === 'oauth_client_id_conta_2');
    const clientSecret2 = configsOAuth.find(c => c.chave === 'oauth_client_secret_conta_2');
    const tokens2 = configsOAuth.find(c => c.chave === 'oauth_tokens_conta_2');
    
    contas.conta_2 = {
      client_id: clientId2?.valor || '',
      client_secret: clientSecret2?.valor || '',
      email: 'conta2@gmail.com', // Placeholder
      status: (clientId2 && clientSecret2 && tokens2) ? 'ativo' : 
              (clientId2 && clientSecret2) ? 'configurado' : 'pendente'
    };

    res.json({
      success: true,
      contas
    });

  } catch (error) {
    console.error('❌ Erro ao consultar status OAuth2:', error);
    res.status(500).json({ 
      error: 'Erro ao consultar status das contas OAuth2',
      details: error.message 
    });
  }
});

// Endpoint para configurar uma conta OAuth2
app.post('/api/oauth/configurar-conta/:numConta', authenticateToken, async (req, res) => {
  try {
    // Apenas ADMIN pode configurar contas
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas ADMIN pode configurar contas OAuth2' });
    }

    const { numConta } = req.params;
    const { client_id, client_secret, email } = req.body;

    console.log(`🔧 Configurando conta ${numConta}...`);

    // Validar entrada
    if (!client_id || !client_secret || !email) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Salvar configurações no banco
    const configsParaSalvar = [
      {
        chave: `oauth_client_id_conta_${numConta}`,
        valor: client_id,
        tipo: 'string',
        descricao: `Client ID OAuth2 para conta ${numConta}`
      },
      {
        chave: `oauth_client_secret_conta_${numConta}`,
        valor: client_secret,
        tipo: 'string',
        descricao: `Client Secret OAuth2 para conta ${numConta}`
      },
      {
        chave: `oauth_config_conta_${numConta}`,
        valor: JSON.stringify({
          client_id,
          client_secret,
          email,
          configurado_em: new Date().toISOString()
        }),
        tipo: 'json',
        descricao: `Configuração completa OAuth2 para conta ${numConta}`
      }
    ];

    // Salvar todas as configurações
    for (const config of configsParaSalvar) {
      await prisma.ConfiguracaoSistema.upsert({
        where: { chave: config.chave },
        update: { 
          valor: config.valor,
          atualizadoEm: new Date()
        },
        create: {
          chave: config.chave,
          valor: config.valor,
          tipo: config.tipo,
          descricao: config.descricao
        }
      });
    }

    // Criar cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      "https://oms-blue-world-backend.up.railway.app/auth/callback"
    );
    
    // Gerar URL de autorização
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/gmail.send'
      ],
      state: `config-conta-${numConta}`,
      prompt: 'consent'
    });

    console.log(`✅ Conta ${numConta} configurada com sucesso!`);
    
    res.json({
      success: true,
      message: `Conta ${numConta} configurada com sucesso!`,
      authUrl,
      conta: numConta
    });

  } catch (error) {
    console.error(`❌ Erro ao configurar conta ${numConta}:`, error);
    res.status(500).json({ 
      error: 'Erro ao configurar conta OAuth2',
      details: error.message 
    });
  }
});

// ******** ENDPOINTS DE NOTIFICAÇÕES ********

app.get('/api/notificacoes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`🔍 Buscando notificações para usuário ${userId}`);
    
    // Filtrar apenas notificações do usuário logado
    const notificacoes = await prisma.notificacao.findMany({
      where: { destinatarioId: userId },
      orderBy: { dataCriacao: 'desc' },
      take: 50
    });
    
    console.log(`📊 Encontradas ${notificacoes.length} notificações para usuário ${userId}`);
    
    res.json(notificacoes);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    // Em caso de erro, retornar array vazio (não bloquear login)
    res.json([]);
  }
});

app.patch('/api/notificacoes/:id/lida', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log(`🔄 Marcando notificação ${id} como lida para usuário ${userId}`);
    
    // Marcar como lida apenas se for do usuário logado
    await prisma.notificacao.update({
      where: { 
        id: parseInt(id),
        destinatarioId: userId  // Só pode marcar suas próprias notificações
      },
      data: { lida: true }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Gerar URL OAuth2 para upload de fotos
app.post('/api/oauth/url-fotos', authenticateToken, async (req, res) => {
  try {
    console.log('🔗 Gerando URL OAuth2 para upload de fotos...');
    
    // Verificar se já tem tokens configurados
    const tokensExistentes = await prisma.ConfiguracaoSistema.findMany({
      where: { 
        chave: { in: ['oauth_tokens_conta_1', 'oauth_tokens_conta_2'] } 
      }
    });
    
    // Se já tem tokens, não precisa gerar URL
    if (tokensExistentes.length > 0) {
      return res.json({ 
        success: false, 
        error: 'Já existem contas OAuth2 configuradas. Use o upload direto.' 
      });
    }
    
    // Buscar credenciais da conta 1
    const configConta1 = await prisma.ConfiguracaoSistema.findMany({
      where: { 
        chave: { in: ['oauth_client_id_conta_1', 'oauth_client_secret_conta_1'] } 
      }
    });
    
    const clientId = configConta1.find(c => c.chave === 'oauth_client_id_conta_1')?.valor;
    const clientSecret = configConta1.find(c => c.chave === 'oauth_client_secret_conta_1')?.valor;
    
    if (!clientId || !clientSecret) {
      return res.json({ 
        success: false, 
        error: 'Configure as credenciais OAuth2 primeiro em Sistema > Configurações' 
      });
    }
    
    // Criar cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "https://oms-blue-world-backend.up.railway.app/auth/callback"
    );
    
    // Gerar URL de autorização com escopo completo (Drive + Gmail)
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/gmail.send'
      ],
      state: 'foto-upload-1',
      prompt: 'consent'
    });
    
    res.json({ 
      success: true, 
      authUrl,
      message: 'Autorize no Google para habilitar upload de fotos'
    });
    
  } catch (error) {
    console.error('Erro ao gerar URL OAuth2:', error);
    res.status(500).json({ error: 'Erro ao gerar URL de autorização' });
  }
});

// Marcar todas as notificações como lidas para o usuário atual
app.patch('/api/notificacoes/todas/lidas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`🔄 Marcando todas notificações como lidas para usuário ${userId}`);
    
    // Verificar quantas não lidas existem antes
    const naoLidasAntes = await prisma.notificacao.count({
      where: { 
        destinatarioId: userId,
        lida: false 
      }
    });
    
    console.log(`📊 Notificações não lidas antes: ${naoLidasAntes}`);
    
    const result = await prisma.notificacao.updateMany({
      where: { 
        destinatarioId: userId,
        lida: false 
      },
      data: { lida: true }
    });
    
    console.log(`✅ Resultado updateMany: ${result.count} notificações marcadas como lidas`);
    
    // Verificar quantas não lidas existem depois
    const naoLidasDepois = await prisma.notificacao.count({
      where: { 
        destinatarioId: userId,
        lida: false 
      }
    });
    
    console.log(`📊 Notificações não lidas depois: ${naoLidasDepois}`);
    
    res.json({ 
      success: true, 
      message: `${result.count} notificações marcadas como lidas`,
      antes: naoLidasAntes,
      depois: naoLidasDepois
    });
  } catch (error) {
    console.error('Erro ao marcar todas como lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar todas as notificações de uma OS específica como lidas para todos os gerentes
app.patch('/api/notificacoes/os/:osId/lidas', authenticateToken, async (req, res) => {
  try {
    const { osId } = req.params;
    const userId = req.user.id;
    
    console.log(`🔄 Marcando notificações da OS ${osId} como lidas para todos os gerentes (ação por usuário ${userId})`);
    
    // Verificar se o usuário é gerente
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { perfil: true }
    });
    
    if (!usuario || !['ADMIN', 'GESTOR'].includes(usuario.perfil)) {
      return res.status(403).json({ error: 'Apenas gerentes podem executar esta ação' });
    }
    
    // Buscar todos os gerentes ativos
    const gestores = await prisma.usuario.findMany({
      where: {
        perfil: { in: ['ADMIN', 'GESTOR'] },
        status: 'ATIVADO'
      },
      select: { id: true }
    });
    
    const gestorIds = gestores.map(g => g.id);
    
    // Contar notificações não lidas da OS antes da atualização
    const naoLidasAntes = await prisma.notificacao.count({
      where: {
        dadosExtras: {
          path: ['osId'],
          equals: parseInt(osId)
        },
        destinatarioId: { in: gestorIds },
        lida: false
      }
    });
    
    console.log(`📊 Notificações não lidas da OS ${osId} antes: ${naoLidasAntes}`);
    
    // Marcar todas as notificações relacionadas à OS como lidas para todos os gerentes
    const result = await prisma.notificacao.updateMany({
      where: {
        dadosExtras: {
          path: ['osId'],
          equals: parseInt(osId)
        },
        destinatarioId: { in: gestorIds },
        lida: false
      },
      data: { lida: true }
    });
    
    console.log(`✅ Resultado: ${result.count} notificações da OS ${osId} marcadas como lidas para todos os gerentes`);
    
    // Verificar notificações não lidas da OS depois
    const naoLidasDepois = await prisma.notificacao.count({
      where: {
        dadosExtras: {
          path: ['osId'],
          equals: parseInt(osId)
        },
        destinatarioId: { in: gestorIds },
        lida: false
      }
    });
    
    console.log(`📊 Notificações não lidas da OS ${osId} depois: ${naoLidasDepois}`);
    
    res.json({
      success: true,
      message: `${result.count} notificações da OS ${osId} marcadas como lidas para todos os gerentes`,
      osId: parseInt(osId),
      antes: naoLidasAntes,
      depois: naoLidasDepois,
      gestoresAfetados: gestorIds.length
    });
    
  } catch (error) {
    console.error('Erro ao marcar notificações da OS como lidas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ******** ENDPOINT TEMPORÁRIO PARA DEBUG ********
app.get('/api/debug/usuario-atual', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userInfo = req.user;
    
    console.log('🔍 DEBUG - Usuário atual:', userInfo);
    
    const naoLidas = await prisma.notificacao.count({
      where: { destinatarioId: userId, lida: false }
    });
    
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nome: true, email: true, perfil: true }
    });
    
    res.json({
      jwt_user: userInfo,
      db_user: usuario,
      notificacoes_nao_lidas: naoLidas
    });
  } catch (error) {
    console.error('Erro debug:', error);
    res.status(500).json({ error: error.message });
  }
});

// ******** MIDDLEWARE DE ERRO GLOBAL ********

app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande (máx 10MB)' });
    }
  }
  
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// ******** ENDPOINT DE MÉTRICAS GLOBAIS ********

app.get('/api/metricas-globais', authenticateToken, async (req, res) => {
  try {
    // Buscar configuração de dias para cálculo global
    const configDias = await prisma.ConfiguracaoSistema.findUnique({
      where: { chave: 'metricas_dias_calculo_global' }
    });
    
    const diasCalculo = configDias ? parseInt(configDias.valor) : 60;
    
    // Buscar instalações finalizadas dos últimos X dias para otimizar performance
    const diasAtras = new Date();
    diasAtras.setDate(diasAtras.getDate() - diasCalculo);
    
    const instalacoesFinalizadas = await prisma.instalacao.findMany({
      where: {
        status: 'CONCLUIDA',
        fluxoAntes: { not: null },
        fluxoDepois: { not: null },
        emboloSelecionado: { not: null },
        dataHoraInicio: { gte: diasAtras }
      },
      select: {
        fluxoAntes: true,
        fluxoDepois: true,
        emboloSelecionado: true,
        dataHoraInicio: true,
        dataHoraFim: true
      }
    });
    
    if (instalacoesFinalizadas.length === 0) {
      return res.json({
        reducaoMediaGlobal: 23.5,
        economiaMediaPorInstalacao: 1.8,
        tempoMedioOperacao: 4,
        totalInstalacoes: 0
      });
    }
    
    // Calcular redução média global
    const reducoesValidas = instalacoesFinalizadas
      .filter(inst => inst.fluxoAntes > 0)
      .map(inst => ((inst.fluxoAntes - inst.fluxoDepois) / inst.fluxoAntes) * 100);
    
    const reducaoMediaGlobal = reducoesValidas.length > 0 
      ? reducoesValidas.reduce((sum, red) => sum + red, 0) / reducoesValidas.length
      : 23.5;
    
    // Calcular economia média por instalação
    const economiasValidas = instalacoesFinalizadas
      .filter(inst => inst.fluxoAntes > 0)
      .map(inst => inst.fluxoAntes - inst.fluxoDepois);
    
    const economiaMediaPorInstalacao = economiasValidas.length > 0
      ? economiasValidas.reduce((sum, eco) => sum + eco, 0) / economiasValidas.length
      : 1.8;
    
    // Calcular tempo médio de operação (horário comercial)
    const temposValidos = instalacoesFinalizadas
      .filter(inst => inst.dataHoraInicio && inst.dataHoraFim)
      .map(inst => {
        const inicio = new Date(inst.dataHoraInicio);
        const fim = new Date(inst.dataHoraFim);
        const horaInicio = inicio.getHours() + inicio.getMinutes() / 60;
        const horaFim = fim.getHours() + fim.getMinutes() / 60;
        
        // Considerando horário comercial 8h-18h
        const inicioEfetivo = Math.max(horaInicio, 8);
        const fimEfetivo = Math.min(horaFim, 18);
        
        return fimEfetivo > inicioEfetivo ? fimEfetivo - inicioEfetivo : 0;
      })
      .filter(tempo => tempo > 0);
    
    const tempoMedioOperacao = temposValidos.length > 0
      ? temposValidos.reduce((sum, tempo) => sum + tempo, 0) / temposValidos.length
      : 4;
    
    res.json({
      reducaoMediaGlobal: Math.round(reducaoMediaGlobal * 10) / 10,
      economiaMediaPorInstalacao: Math.round(economiaMediaPorInstalacao * 10) / 10,
      tempoMedioOperacao: Math.round(tempoMedioOperacao * 10) / 10,
      totalInstalacoes: instalacoesFinalizadas.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar métricas globais:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar métricas globais',
      reducaoMediaGlobal: 23.5,
      economiaMediaPorInstalacao: 1.8,
      tempoMedioOperacao: 4,
      totalInstalacoes: 0
    });
  }
});

// ******** ROTA 404 ********

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado' });
});

// ******** GRACEFUL SHUTDOWN ********

process.on('SIGTERM', async () => {
  console.log('🔄 Iniciando graceful shutdown...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Iniciando graceful shutdown...');
  await prisma.$disconnect();
  process.exit(0);
});

// ******** INICIALIZAÇÃO ********

app.listen(PORT, () => {
  console.log(`🚀 API OMS BlueWorld rodando em porta ${PORT}`);
  console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Endpoints disponíveis:`);
  console.log(`   POST /api/login`);
  console.log(`   GET  /api/usuarios`);
  console.log(`   GET  /api/usuarios/buscar/:cpf`);
  console.log(`   PUT  /api/usuarios/atualizar/:cpf`);
  console.log(`   PATCH /api/usuarios/senha/:cpf`);
  console.log(`   GET  /api/ordens-servico`);
  console.log(`   POST /api/instalacoes`);
  console.log(`   ✅ POST /api/instalacoes/progresso (Step 1 - CREATE)`);
  console.log(`   ✅ PATCH /api/instalacoes/progresso/:id (Steps 2+ - UPDATE)`);
  console.log(`   ✅ GET /api/instalacoes/progresso/:ordemServicoId (READ)`);
  console.log(`   ✅ GET /api/instalacoes/andamento-os/:ordemServicoId (LIST)`);
  console.log(`   ✅ DELETE /api/instalacoes/progresso/:id (CANCEL)`);
  console.log(`   ✅ PATCH /api/instalacoes/finalizar/:id (FINALIZE)`);
  console.log(`   ✅ POST /api/upload-foto-gdrive (campo 'foto')`);
  console.log(`   ✅ GET /api/gdrive/status (DEBUG ADMIN)`);
  console.log(`   ✅ PATCH /api/gdrive/reativar/:chave (DEBUG ADMIN)`);
  console.log(`   POST /api/ordens-servico/:id/finalizar`);
  console.log(`   GET  /api/estatisticas`);
  console.log(`   GET  /api/metricas-globais`);
  console.log(`   GET  /health`);
  console.log(`🎯 SISTEMA COMPLETO CORRIGIDO E OPERACIONAL!`);
  console.log(`✨ CORREÇÕES APLICADAS:`);
  console.log(`   🔧 Sintaxe JavaScript corrigida`);
  console.log(`   📊 Relatório HTML épico implementado`);
  console.log(`   🔍 Função buscarContasGDrive() corrigida`);
  console.log(`   📤 Upload Google Drive funcional`);
  console.log(`   💧 Sistema BlueWorld 100% operacional!`);
});

// ===== ENDPOINT PARA BUSCAR HTML DO RELATÓRIO =====
app.get('/api/relatorio-html/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📊 Buscando HTML do relatório para OS #${id}`);
    
    // Buscar OS com HTML no campo observacao
    const ordem = await prisma.ordemservico.findUnique({
      where: { id: Number(id) },
      select: { 
        id: true,
        cliente: true,
        observacao: true,
        status: true
      }
    });
    
    if (!ordem) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }
    
    if (!ordem.observacao) {
      return res.status(404).json({ error: 'Relatório HTML não encontrado para esta OS' });
    }
    
    console.log(`✅ HTML do relatório encontrado para OS #${id}`);
    
    res.json({
      success: true,
      htmlContent: ordem.observacao,
      cliente: ordem.cliente,
      osId: ordem.id,
      status: ordem.status
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar HTML do relatório:', error);
    res.status(500).json({ error: 'Erro ao buscar relatório', details: error.message });
  }
});

// ===== ROTA PARA RENDERIZAR RELATÓRIOS FINAIS =====
app.get('/relatoriosfinais', async (req, res) => {
  console.log('🎯 Endpoint /relatoriosfinais chamado');
  
  try {
    const osId = req.query.os;
    console.log(`📊 OS ID recebido: ${osId}`);
    
    if (!osId) {
      console.log('❌ OS ID não fornecido');
      return res.status(400).send('<html><body><h1>❌ Erro</h1><p>ID da OS não fornecido</p><p>URL deve ser: /relatoriosfinais?os=ID</p></body></html>');
    }
    
    console.log(`🔍 Buscando OS #${osId} no banco...`);
    
    // Buscar OS com HTML no campo observacao
    const ordem = await prisma.ordemservico.findUnique({
      where: { id: Number(osId) },
      select: { 
        id: true,
        cliente: true,
        observacao: true,
        status: true
      }
    });
    
    if (!ordem) {
      console.log(`❌ OS #${osId} não encontrada`);
      return res.status(404).send('<html><body><h1>❌ OS não encontrada</h1><p>Ordem de Serviço não existe</p></body></html>');
    }
    
    console.log(`📋 OS encontrada: ${ordem.cliente} - Status: ${ordem.status}`);
    
    if (!ordem.observacao) {
      console.log(`📊 Relatório não disponível para OS #${osId}`);
      return res.status(404).send(`<html><body><h1>📊 Relatório não disponível</h1><p>Relatório da OS #${osId} ainda não foi gerado</p><p>Cliente: ${ordem.cliente}</p></body></html>`);
    }
    
    console.log(`✅ Renderizando HTML do relatório para OS #${osId} - Cliente: ${ordem.cliente}`);
    
    // Renderizar HTML diretamente
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(ordem.observacao);
    
  } catch (error) {
    console.error('❌ Erro ao renderizar relatório:', error);
    res.status(500).send('<html><body><h1>❌ Erro interno</h1><p>Erro ao carregar relatório</p></body></html>');
  }
});