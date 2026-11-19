/* Traduz para inglês as mensagens de erro do servidor quando a página está em inglês.
   O servidor responde sempre em português; aqui ficam as mensagens que aparecem nas
   páginas com botão de idioma (acesso e área do cliente). Mensagens desconhecidas
   são mostradas como vieram. */
(() => {
  'use strict';
  const EXACT = {
    'Dados muito longos.': 'The data is too long.',
    'Dados inválidos.': 'Invalid data.',
    'Dados inválidos ou muito longos.': 'Invalid or too long data.',
    'Escolha pessoa física ou empresa.': 'Choose individual or company.',
    'Somente profissionais podem se cadastrar como empresa.': 'Only professionals can register as a company.',
    'Confira o CNPJ: são 14 dígitos com os verificadores corretos.': 'Check the CNPJ: it has 14 digits with valid check digits.',
    'Informe o nome da empresa (de 3 a 150 caracteres).': 'Enter the company name (3 to 150 characters).',
    'Confira nome, e-mail, CPF (11 dígitos), telefone e senha (8 a 128 caracteres).': 'Check the username, email, CPF (11 digits), phone and password (8 to 128 characters).',
    'Informe sua especialidade.': 'Enter your specialty.',
    'Não foi possível verificar o cadastro.': 'Could not check the registration.',
    'Não foi possível cadastrar a conta.': 'Could not create the account.',
    'Banco de dados indisponível.': 'The database is unavailable.',
    'Endereço inválido.': 'Invalid address.',
    'Não foi possível verificar a sessão.': 'Could not verify your session.',
    'Origem não permitida.': 'Origin not allowed.',
    'Entre novamente para continuar.': 'Sign in again to continue.',
    'Acesso exclusivo da administração.': 'Restricted to administrators.',
    'Seu acesso a esta operação foi desativado pela administração.': 'Your access to this operation was disabled by the administrators.',
    'Somente clientes gerenciam suas formas de pagamento.': 'Only clients manage payment methods.',
    'Envie apenas os metadados permitidos. Número completo, CVV e credenciais não são aceitos.': 'Send only the allowed details. Full card numbers, CVV and credentials are not accepted.',
    'Forma de pagamento ou apelido inválido.': 'Invalid payment method or nickname.',
    'Confira titular, bandeira, últimos quatro dígitos e validade do cartão demonstrativo.': 'Check the holder, brand, last four digits and expiry of the demo card.',
    'Não foi possível salvar a forma de pagamento.': 'Could not save the payment method.',
    'Forma de pagamento não encontrada.': 'Payment method not found.',
    'Operação não permitida.': 'Operation not allowed.',
    'Este perfil não pode realizar esta operação.': 'This profile cannot perform this operation.',
    'Pedido não encontrado para esta conta.': 'Order not found for this account.',
    'Escolha uma nota de 1 a 5 e um comentário de até 1000 caracteres.': 'Choose a rating from 1 to 5 and a comment of up to 1000 characters.',
    'Aguarde o funcionário concluir o serviço. Cada serviço pode ser avaliado uma única vez.': 'Wait for the professional to complete the service. Each service can be rated only once.',
    'Selecione uma forma de pagamento cadastrada.': 'Select a saved payment method.',
    'Pagamento já simulado ou forma de pagamento indisponível. Atualize a página.': 'Payment already simulated or payment method unavailable. Refresh the page.',
    'Não foi possível atualizar o pedido.': 'Could not update the order.',
    'Muitas tentativas. Aguarde 15 minutos.': 'Too many attempts. Wait 15 minutes.',
    'Perfil, e-mail e senha são obrigatórios.': 'Profile, email and password are required.',
    'Não foi possível verificar o acesso. Tente novamente.': 'Could not verify your access. Try again.',
    'E-mail ou senha inválidos para este perfil.': 'Invalid email or password for this profile.',
    'Não foi possível carregar os registros.': 'Could not load the records.',
    'Não foi possível carregar os pedidos.': 'Could not load the orders.',
    'Serviço não encontrado.': 'Service not found.',
    'Somente clientes podem solicitar serviços.': 'Only clients can request services.',
    'Solicitação muito longa.': 'The request is too long.',
    'Informe serviço, data, endereço e descrição válidos.': 'Enter a valid service, date, address and description.',
    'Escolha uma data válida a partir de hoje.': 'Choose a valid date from today on.',
    'Não foi possível consultar os cadastros.': 'Could not look up the records.',
    'Serviço não encontrado. Atualize a página.': 'Service not found. Refresh the page.',
    'Não foi possível registrar o pedido.': 'Could not place the order.',
    'Não encontrado.': 'Not found.',
    'Erro interno. Tente novamente.': 'Internal error. Try again.',
    'Falha de auditoria. Consulte o estado da operação antes de tentar novamente.': 'Audit failure. Check whether the operation went through before trying again.',
    // Mensagens do próprio navegador (data-source.js).
    'Não foi possível conectar ao servidor. Tente novamente.': 'Could not connect to the server. Try again.',
    'Não foi possível carregar os dados. Abra o projeto pelo servidor.': 'Could not load the data. Open the project through the server.',
    'Não foi possível carregar os dados.': 'Could not load the data.',
    'Resposta de dados inválida.': 'Invalid data response.',
  };
  const PATTERNS = [
    [/^Preencha nome, e-mail, (CPF|CNPJ), telefone e senha\.$/, (m, doc) => 'Fill in the username, email, ' + doc + ', phone and password.'],
    [/^Já existe uma conta com este e-mail ou (CPF|CNPJ) neste perfil\.$/, (m, doc) => 'An account with this email or ' + doc + ' already exists for this profile.'],
    [/^E-mail ou (CPF|CNPJ) já cadastrado\.$/, (m, doc) => 'Email or ' + doc + ' already registered.'],
  ];
  function translate(message) {
    if (typeof message !== 'string' || !/^en\b/i.test(document.documentElement.lang || '')) return message;
    if (Object.hasOwn(EXACT, message)) return EXACT[message];
    for (const [pattern, build] of PATTERNS) { const m = message.match(pattern); if (m) return build(...m); }
    return message;
  }
  window.DafixServerMessage = translate;
})();
