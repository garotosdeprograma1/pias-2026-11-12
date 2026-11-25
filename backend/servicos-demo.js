/* Catálogo de demonstração: serviços típicos de marido de aluguel, para apresentações.
   Só acrescenta os serviços que ainda não existem (comparando pelo nome); nunca altera
   nem apaga serviços já cadastrados. Os preços são valores de referência.

   Uso no terminal, na pasta do projeto:
     node backend/servicos-demo.js
   Ou pelo painel: Administração → Catálogo de serviços → Adicionar serviços de demonstração. */
'use strict';

const CATALOGO = [
  ['Instalação de chuveiro elétrico', 'Troca ou instalação de chuveiro, com conferência da fiação, vedação e teste de funcionamento.', 120],
  ['Troca de tomadas e interruptores', 'Substituição de até 3 tomadas ou interruptores, com teste do circuito.', 90],
  ['Instalação de luminária ou lustre', 'Fixação no teto ou na parede e ligação elétrica de uma luminária ou lustre.', 110],
  ['Instalação de ventilador de teto', 'Montagem, fixação e ligação elétrica de ventilador de teto, com teste de velocidades.', 180],
  ['Reparo de vazamento em torneira ou registro', 'Troca de reparo, vedante ou cartucho para acabar com gotejamentos.', 100],
  ['Desentupimento de pia ou ralo', 'Desobstrução de pia, tanque ou ralo sem quebrar o piso.', 150],
  ['Troca de sifão e flexível', 'Substituição de sifão e mangueira flexível de pia ou lavatório.', 80],
  ['Instalação de prateleiras e nichos', 'Fixação de até 3 prateleiras ou nichos com bucha e parafuso, nivelados.', 90],
  ['Instalação de suporte de TV', 'Fixação de suporte para TV de até 55 polegadas, com nivelamento e organização dos cabos.', 140],
  ['Montagem de móveis', 'Montagem de um móvel de pequeno ou médio porte, como cômoda, rack ou escrivaninha.', 160],
  ['Instalação de cortina ou persiana', 'Instalação de varão, trilho ou persiana em até 2 janelas.', 100],
  ['Troca de fechadura ou maçaneta', 'Substituição de fechadura ou maçaneta de porta interna ou externa.', 110],
  ['Instalação de varal de teto', 'Fixação de varal de teto ou de parede na área de serviço.', 90],
  ['Rejuntamento de azulejos', 'Remoção do rejunte antigo e aplicação de rejunte novo em até 5 m² de box ou bancada.', 220],
  ['Retoque de pintura', 'Correção de pequenas imperfeições e retoque de pintura em paredes, até 10 m².', 250],
  ['Serviços gerais — 1 hora', 'Uma hora de trabalho para pequenos reparos variados na casa. Materiais à parte.', 95],
].map(([nome_servico, descricao, preco_base]) => ({nome_servico, descricao, preco_base}));

// Insere os serviços que faltam e informa quantos foram acrescentados.
async function inserirCatalogo(db) {
  await db.ready;
  const all = (sql, args = []) => new Promise((resolve, reject) => db.all(sql, args, (e, r) => e ? reject(e) : resolve(r)));
  const run = (sql, args = []) => new Promise((resolve, reject) => db.run(sql, args, e => e ? reject(e) : resolve()));
  const existentes = new Set((await all('SELECT nome_servico FROM servico')).map(s => s.nome_servico.trim().toLocaleLowerCase('pt-BR')));
  const novos = CATALOGO.filter(s => !existentes.has(s.nome_servico.toLocaleLowerCase('pt-BR')));
  // Sem transação: no servidor a conexão é compartilhada com outras requisições.
  // Se algo falhar no meio, basta repetir; os serviços já inseridos são pulados.
  for (const s of novos) await run('INSERT INTO servico (nome_servico, descricao, preco_base) VALUES (?, ?, ?)', [s.nome_servico, s.descricao, s.preco_base]);
  return {inseridos: novos.length, existentes: CATALOGO.length - novos.length, total: CATALOGO.length};
}

module.exports = {CATALOGO, inserirCatalogo};

if (require.main === module) {
  const db = require('./db');
  inserirCatalogo(db)
    .then(r => console.log(r.inseridos ? `${r.inseridos} serviço(s) de demonstração adicionado(s); ${r.existentes} já existia(m).` : 'Todos os serviços de demonstração já estão no catálogo.'))
    .catch(error => { console.error('Não foi possível adicionar os serviços:', error.message); process.exitCode = 1; })
    .finally(() => db.close());
}
