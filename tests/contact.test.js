'use strict';

// Página de Contato: envio público, limites, vínculo com a sessão e leitura pela administração.
// Servidor e banco temporários; backend/banco.db não é alterado.
const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
let directory, child, origin;
const account = {nome:'contato.teste', email:'contato@example.test', cpf:'52998224725', telefone:'11999998888', senha:'GestaoTeste123'};

before(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dafix-contact-'));
  const backend = path.resolve(__dirname, '../backend');
  for (const name of ['db.js','auth.js','criar-admin.js','servicos-demo.js']) fs.copyFileSync(path.join(backend,name), path.join(directory,name));
  fs.symlinkSync(path.join(backend,'node_modules'),path.join(directory,'node_modules'));
  const source = fs.readFileSync(path.join(backend,'server.js'),'utf8')
    .replaceAll("'../frontend'",JSON.stringify(path.resolve(__dirname,'../frontend')))
    .replace('var PORTA = Number(process.env.PORT) || 5000;', 'var PORTA = 0;')
    .replace("var HOST = process.env.PORT ? '0.0.0.0' : 'localhost';", "var HOST = '127.0.0.1';")
    .replace("console.log('  Pronto! Gravando em banco.db (SQLite).');", "console.log('TEST_PORT=' + servidor.address().port);");
  fs.writeFileSync(path.join(directory,'server.js'),source);
  child=spawn(process.execPath,[path.join(directory,'server.js')],{stdio:['ignore','pipe','pipe']});
  origin=await new Promise((resolve,reject)=>{
    let output='',errors='';
    const timeout=setTimeout(()=>reject(new Error('Servidor de teste não iniciou: '+errors)),10000);
    child.once('error',error=>{clearTimeout(timeout);reject(error);});
    child.once('exit',code=>{clearTimeout(timeout);reject(new Error('Servidor encerrou: '+code+' '+errors));});
    child.stderr.on('data',chunk=>{errors+=chunk;});
    child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/TEST_PORT=(\d+)/);if(match){clearTimeout(timeout);resolve('http://127.0.0.1:'+match[1]);}});
  });
});
after(async()=>{
  if(child && child.exitCode===null) await new Promise(resolve=>{child.once('exit',resolve);child.kill();});
  if(directory)fs.rmSync(directory,{recursive:true,force:true});
});
async function request(url,method='GET',body,cookie='') {
  const response=await fetch(origin+url,{method,headers:{'Content-Type':'application/json',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'manual'});
  return {status:response.status,data:await response.json().catch(()=>null),cookie:response.headers.get('set-cookie')?.split(';')[0],location:response.headers.get('location'),type:response.headers.get('content-type')};
}
const post=(url,body,cookie)=>request(url,'POST',body,cookie);
const login=(perfil,email=account.email)=>post('/api/login',{perfil,email,senha:account.senha});
function ok(result,status=200) {assert.equal(result.status,status,JSON.stringify(result.data));return result.data;}
const message={nome:'Visitante de teste',email:'Visitante@Example.test',perfil:'visitante',assunto:'pedidos',pedido:7,mensagem:'Gostaria de saber como acompanhar o meu pedido.'};

test('contact messages are validated, rate limited, tied to the session and managed by admins',async t=>{
  ok(await post('/api/clientes',account),201);
  await new Promise((resolve,reject)=>{
    const proc=spawn(process.execPath,[path.join(directory,'criar-admin.js'),account.email],{stdio:'ignore'});
    proc.once('error',reject);proc.once('exit',code=>code?reject(new Error('Falha ao criar administrador')):resolve());
  });
  const client=await login('cliente'),admin=await login('admin');ok(client);ok(admin);

  await t.test('anyone can send a valid message and gets a protocol',async()=>{
    const sent=ok(await post('/api/contato',message),201);
    assert.match(sent.protocolo,/^DFX-\d{6}$/);
    const list=ok(await request('/api/admin/contatos',undefined,undefined,admin.cookie));
    const row=list.registros.find(r=>r.id===sent.id);
    assert.equal(row.email,'visitante@example.test');assert.equal(row.status,'nova');assert.equal(row.pedido,7);assert.equal(row.conta_id,null);
  });

  await t.test('invalid messages are refused with a clear reason',async()=>{
    for(const invalid of [{...message,nome:' '},{...message,email:'sem-arroba'},{...message,assunto:'spam'},{...message,mensagem:'curta'},{...message,mensagem:'x'.repeat(2001)},{...message,pedido:'7'},{...message,pedido:0},{...message,extra:1},{...message,site:'http://robo'}]) {
      const r=await post('/api/contato',invalid);assert.equal(r.status,400,JSON.stringify(invalid));assert(r.data.erro);
    }
  });

  await t.test('a signed-in client has the profile confirmed by the session',async()=>{
    const sent=ok(await post('/api/contato',{...message,perfil:'funcionario',pedido:null},client.cookie),201);
    const row=ok(await request('/api/admin/contatos?busca=Visitante',undefined,undefined,admin.cookie)).registros.find(r=>r.id===sent.id);
    assert.equal(row.perfil,'cliente');assert.equal(row.conta_tipo,'cliente');assert.equal(row.conta_id,client.data.usuario.id);assert.equal(row.pedido,null);
  });

  await t.test('only admins read and update messages; filters and status counts work',async()=>{
    for(const cookie of [undefined,client.cookie]) {
      assert.notEqual((await request('/api/admin/contatos',undefined,undefined,cookie)).status,200);
      assert.notEqual((await request('/api/admin/contatos/1','PATCH',{status:'respondida'},cookie)).status,200);
    }
    ok(await request('/api/admin/contatos/1','PATCH',{status:'respondida'},admin.cookie));
    for(const bad of [{status:'apagada'},{status:'nova',nota:1},{}])assert.equal((await request('/api/admin/contatos/1','PATCH',bad,admin.cookie)).status,400);
    assert.equal((await request('/api/admin/contatos/999999','PATCH',{status:'nova'},admin.cookie)).status,404);
    const answered=ok(await request('/api/admin/contatos?status=respondida',undefined,undefined,admin.cookie));
    assert.equal(answered.total,1);assert.equal(answered.por_status.respondida,1);assert.equal(answered.por_status.nova,1);
    assert.equal((await request('/api/admin/contatos?status=apagada',undefined,undefined,admin.cookie)).status,400);
    assert.equal(ok(await request('/api/admin/contatos?busca=%25',undefined,undefined,admin.cookie)).total,0);
    const logs=ok(await request('/api/admin/logs?evento=contato.enviado',undefined,undefined,admin.cookie));
    assert.equal(logs.total,2);assert(!JSON.stringify(logs).includes(message.mensagem));
  });

  await t.test('simultaneous sends cannot get past the limit',async()=>{
    // Duas mensagens já foram aceitas; restam três vagas, mesmo com dez envios ao mesmo tempo.
    const results=await Promise.all(Array.from({length:10},()=>post('/api/contato',message)));
    const accepted=results.filter(r=>r.status===201).length;
    assert.equal(accepted,3,'aceitas: '+accepted);
    assert(results.every(r=>[201,429].includes(r.status)));
    // As nove recusas por validação do teste anterior devolveram a vaga; se tivessem consumido, nenhuma seria aceita.
  });

  await t.test('each address can send at most five messages every 15 minutes',async()=>{
    // As cinco vagas foram usadas: qualquer novo envio é recusado com uma mensagem clara.
    const r=await post('/api/contato',message);assert.equal(r.status,429);assert(r.data.erro);
  });
});
