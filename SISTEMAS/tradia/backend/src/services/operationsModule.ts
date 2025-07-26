/**
 * MÓDULO DE OPERAÇÕES - TRAD.IA
 * Define quando usar compras, vendas e vendas a descoberto
 */

interface OperationType {
  type: 'BUY' | 'SELL' | 'SHORT';
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  marginRequired: boolean;
  suitableFor: string[];
  brokerRequirements: string[];
}

interface OperationContext {
  symbol: string;
  operation: OperationType;
  strategy: string;
  reasoning: string;
  requirements: string[];
  risks: string[];
  alternatives?: string;
}

export class OperationsModule {
  
  static operationTypes: { [key: string]: OperationType } = {
    BUY: {
      type: 'BUY',
      description: 'Compra de ações - Especulação de alta',
      riskLevel: 'low',
      marginRequired: false,
      suitableFor: ['Iniciantes', 'Conservadores', 'Moderados', 'Agressivos'],
      brokerRequirements: ['Capital disponível', 'Conta ativa']
    },
    SELL: {
      type: 'SELL',
      description: 'Venda de ações já possuídas - Realização de lucros/prejuízos',
      riskLevel: 'low',
      marginRequired: false,
      suitableFor: ['Todos os perfis'],
      brokerRequirements: ['Possuir as ações', 'Conta ativa']
    },
    SHORT: {
      type: 'SHORT',
      description: 'Venda a descoberto - Especulação de queda (tomar emprestado para vender)',
      riskLevel: 'high',
      marginRequired: true,
      suitableFor: ['Experientes', 'Agressivos'],
      brokerRequirements: ['Margem habilitada', 'Capital para garantia', 'Experiência comprovada']
    }
  };

  static getCurrentOperations(): OperationContext[] {
    return [
      // COMPRAS (BUY) - Mais comuns
      {
        symbol: 'B3SA3',
        operation: this.operationTypes.BUY,
        strategy: 'Gap Trading',
        reasoning: 'Gap de -2.8% para baixo. Esperamos reversão (alta) para fechar o gap.',
        requirements: [
          'Ter R$ 2.460 disponíveis',
          'Conta ativa na corretora',
          'Não precisa de margem'
        ],
        risks: [
          'Ação pode continuar caindo',
          'Gap pode não fechar no prazo',
          'Perda máxima limitada ao stop loss (-2.2%)'
        ]
      },
      
      {
        symbol: 'PETR4',
        operation: this.operationTypes.BUY,
        strategy: 'Swing Trade',
        reasoning: 'RSI oversold + divergência bullish. Esperamos alta de médio prazo.',
        requirements: [
          'Ter R$ 3.075 disponíveis',
          'Paciência para 5-8 dias',
          'Disciplina para stops'
        ],
        risks: [
          'Mercado pode continuar em baixa',
          'Notícias negativas da empresa',
          'Perda limitada pelo stop loss'
        ]
      },

      // VENDAS (SELL) - Realização de lucros
      {
        symbol: 'ITUB4',
        operation: this.operationTypes.SELL,
        strategy: 'Take Profit - Swing Trade',
        reasoning: 'Ação atingiu resistência técnica. RSI overbought. Hora de realizar lucros.',
        requirements: [
          'Possuir ações de ITUB4',
          'Preço atual próximo do target',
          'Não precisa de margem'
        ],
        risks: [
          'Ação pode continuar subindo (custo de oportunidade)',
          'Timing de saída pode não ser ideal',
          'Risco mínimo - apenas timing'
        ]
      },

      // VENDAS A DESCOBERTO (SHORT) - Especulação de queda
      {
        symbol: 'WEGE3 vs PETR4',
        operation: this.operationTypes.SHORT,
        strategy: 'Pairs Trading - Long/Short',
        reasoning: 'WEGE3 está relativamente cara vs PETR4. Vender WEGE3 descoberto e comprar PETR4.',
        requirements: [
          'Conta margem habilitada',
          'Garantias (110-150% do valor)',
          'Experiência em derivativos',
          'Capital para margem inicial'
        ],
        risks: [
          'Perda teoricamente ilimitada',
          'Margin calls se ação subir muito',
          'Custos de empréstimo das ações',
          'Liquidity squeeze'
        ],
        alternatives: 'Como o short é arriscado, sugerimos apenas COMPRAR PETR4 (sem vender WEGE3 descoberto)'
      }
    ];
  }

  static displayOperationsGuide(): void {
    console.log('📚 GUIA DE OPERAÇÕES - TRAD.IA');
    console.log('═'.repeat(80));
    
    // EXPLICAR CADA TIPO
    console.log('\n🎯 TIPOS DE OPERAÇÕES DISPONÍVEIS:');
    console.log('─'.repeat(60));
    
    Object.values(this.operationTypes).forEach(opType => {
      const riskIcon = opType.riskLevel === 'low' ? '🟢' : opType.riskLevel === 'medium' ? '🟡' : '🔴';
      console.log(`\n${riskIcon} ${opType.type} - ${opType.description}`);
      console.log(`   Risco: ${opType.riskLevel.toUpperCase()}`);
      console.log(`   Margem: ${opType.marginRequired ? 'Sim' : 'Não'}`);
      console.log(`   Adequado para: ${opType.suitableFor.join(', ')}`);
      console.log(`   Requisitos: ${opType.brokerRequirements.join(', ')}`);
    });

    // OPERAÇÕES ATUAIS
    console.log('\n📊 OPERAÇÕES RECOMENDADAS ATUALMENTE:');
    console.log('─'.repeat(60));
    
    const operations = this.getCurrentOperations();
    operations.forEach((op, index) => {
      const opIcon = op.operation.type === 'BUY' ? '🟢' : op.operation.type === 'SELL' ? '🔴' : '🟠';
      const riskIcon = op.operation.riskLevel === 'low' ? '🟢' : op.operation.riskLevel === 'medium' ? '🟡' : '🔴';
      
      console.log(`\n${opIcon} OPERAÇÃO ${index + 1}: ${op.operation.type} ${op.symbol}`);
      console.log(`📊 Estratégia: ${op.strategy}`);
      console.log(`${riskIcon} Risco: ${op.operation.riskLevel.toUpperCase()}`);
      console.log(`💡 Lógica: ${op.reasoning}`);
      
      console.log(`\n   ✅ REQUISITOS:`);
      op.requirements.forEach(req => console.log(`   • ${req}`));
      
      console.log(`\n   ⚠️ RISCOS:`);
      op.risks.forEach(risk => console.log(`   • ${risk}`));
      
      if (op.alternatives) {
        console.log(`\n   💡 ALTERNATIVA MAIS SEGURA:`);
        console.log(`   • ${op.alternatives}`);
      }
    });

    // RECOMENDAÇÕES POR PERFIL
    console.log('\n👤 RECOMENDAÇÕES POR PERFIL DE INVESTIDOR:');
    console.log('─'.repeat(60));
    
    console.log('\n🟢 PERFIL CONSERVADOR:');
    console.log('• Foque apenas em operações BUY e SELL');
    console.log('• Evite vendas a descoberto (SHORT)');
    console.log('• Prefira ações de empresas sólidas');
    console.log('• Use sempre stop loss');
    
    console.log('\n🟡 PERFIL MODERADO:');
    console.log('• BUY e SELL são ideais');
    console.log('• Pode considerar SHORT apenas em pairs trading simples');
    console.log('• Diversifique as estratégias');
    console.log('• Mantenha controle de risco rigoroso');
    
    console.log('\n🔴 PERFIL AGRESSIVO:');
    console.log('• Pode usar todas as operações (BUY, SELL, SHORT)');
    console.log('• Pairs trading com long/short simultâneos');
    console.log('• Maior exposição, mas com gestão de risco');
    console.log('• Aproveite volatilidade com disciplina');

    // REQUISITOS PRÁTICOS
    console.log('\n🏦 REQUISITOS PRÁTICOS NAS CORRETORAS:');
    console.log('─'.repeat(60));
    
    console.log('\n🟢 PARA COMPRAS (BUY):');
    console.log('• Qualquer corretora (Rico, XP, Clear, etc.)');
    console.log('• Apenas capital disponível');
    console.log('• Processo simples no home broker');
    console.log('• Ideal para iniciantes');
    
    console.log('\n🔴 PARA VENDAS NORMAIS (SELL):');
    console.log('• Possuir as ações na carteira');
    console.log('• Operação simples');
    console.log('• Sem requisitos especiais');
    
    console.log('\n🟠 PARA VENDAS A DESCOBERTO (SHORT):');
    console.log('• Conta margem habilitada');
    console.log('• Comprovação de experiência');
    console.log('• Depósito de garantia (110-150%)');
    console.log('• Termo de risco assinado');
    console.log('• Capital mínimo (geralmente R$ 25.000+)');
    
    console.log('\n🎯 ESTRATÉGIA RECOMENDADA PARA INICIANTES:');
    console.log('─'.repeat(60));
    console.log('1. 🟢 Comece apenas com COMPRAS (BUY)');
    console.log('2. 🔴 Aprenda a VENDER (SELL) para realizar lucros');
    console.log('3. 📚 Estude bastante antes de considerar SHORT');
    console.log('4. 💰 Sempre use stop loss');
    console.log('5. 📊 Acompanhe performance vs benchmark');
    
    console.log('\n💡 RESUMO EXECUTIVO:');
    console.log('─'.repeat(60));
    console.log('• BUY: Operação principal, baixo risco, para todos');
    console.log('• SELL: Realização de lucros, baixo risco');
    console.log('• SHORT: Avançada, alto risco, apenas experientes');
    console.log('• Nossa plataforma foca principalmente em BUY/SELL');
    console.log('• SHORT apenas em pairs trading para hedging');
    
    console.log('\n🤖 TRAD.IA - FOCO EM OPERAÇÕES SEGURAS E RENTÁVEIS ✅');
  }

  static getSimplifiedRecommendations(): void {
    console.log('\n📋 RECOMENDAÇÕES SIMPLIFICADAS ATUAIS:');
    console.log('═'.repeat(60));
    
    console.log('🟢 COMPRAR (Recomendado para todos):');
    console.log('• B3SA3: R$ 11,20 - Gap trading (+3.2% esperado)');
    console.log('• PETR4: R$ 38,90 - Swing trade (+5.9% esperado)');
    console.log('• ABEV3: R$ 15,85 - Pairs trading (+2.8% esperado)');
    
    console.log('\n🔴 VENDER (Se possuir as ações):');
    console.log('• ITUB4: R$ 34,20 - Take profit (RSI overbought)');
    console.log('• WEGE3: R$ 53,60 - Stop loss urgente');
    
    console.log('\n🟠 VENDA DESCOBERTA (Apenas experientes):');
    console.log('• Não recomendamos para iniciantes');
    console.log('• Foque primeiro em compras e vendas normais');
    console.log('• Considere apenas após 1 ano de experiência');
    
    console.log('\n💰 GESTÃO DE CAPITAL SUGERIDA:');
    console.log('• 60% em compras planejadas');
    console.log('• 30% em cash para oportunidades');
    console.log('• 10% para experimentação (se experiente)');
    
    console.log('\n📱 PRÓXIMOS PASSOS:');
    console.log('1. Escolha as compras que fazem sentido para seu perfil');
    console.log('2. Execute na sua corretora');
    console.log('3. Configure stops conforme sugerido');
    console.log('4. Acompanhe e aprenda com os resultados');
  }
}

// Executar guias
console.log('🚀 INICIANDO MÓDULO DE OPERAÇÕES TRAD.IA\n');
OperationsModule.displayOperationsGuide();
OperationsModule.getSimplifiedRecommendations();
