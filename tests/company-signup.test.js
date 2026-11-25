'use strict';

// Cadastro de profissionais como pessoa física (CPF) ou empresa (CNPJ).
// Servidor e banco temporários; backend/banco.db não é alterado.
const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
let directory, child, origin;
const account = {nome:'empresa.teste', email:'empresa@example.test', cpf:'52998224725', telefone:'11999998888', senha:'GestaoTeste123'};

before(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dafix-company-'));
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
const company={nome:'reparos.silva',email:'contato@reparos.example',telefone:'11988887777',senha:'Empresa12345',especialidade:'Elétrica',tipo_pessoa:'juridica',cnpj:'11.222.333/0001-81',razao_social:'Reparos Silva Ltda.'};

test('professionals can register as a company with a valid CNPJ and company name',async t=>{
  ok(await post('/api/clientes',account),201);
  await new Promise((resolve,reject)=>{
    const proc=spawn(process.execPath,[path.join(directory,'criar-admin.js'),account.email],{stdio:'ignore'});
    proc.once('error',reject);proc.once('exit',code=>code?reject(new Error('Falha ao criar administrador')):resolve());
  });
  const admin=await login('admin');ok(admin);
  let companyId;

  await t.test('a company registration is stored with its CNPJ and can sign in',async()=>{
    const created=ok(await post('/api/funcionarios',company),201);
    assert.equal(created.tipo_pessoa,'juridica');assert.equal(created.razao_social,'Reparos Silva Ltda.');
    companyId=created.id;
    const signed=ok(await post('/api/login',{perfil:'funcionario',email:company.email,senha:company.senha}));
    assert.equal(signed.usuario.id,companyId);
    const row=ok(await request('/api/funcionarios',undefined,undefined,admin.cookie)).find(p=>p.id===companyId);
    assert.equal(row.cpf,'11222333000181');assert.equal(row.tipo_pessoa,'juridica');assert.equal(row.razao_social,'Reparos Silva Ltda.');
  });

  await t.test('individual registrations keep working, with or without the type',async()=>{
    const implicit=ok(await post('/api/funcionarios',{...account,email:'pf1@example.test',especialidade:'Pintura'}),201);
    assert.equal(implicit.tipo_pessoa,'fisica');assert.equal(implicit.razao_social,undefined);
    ok(await post('/api/funcionarios',{...account,email:'pf2@example.test',cpf:'11144477735',especialidade:'Pintura',tipo_pessoa:'fisica'}),201);
  });

  await t.test('invalid company registrations are refused with a clear reason',async()=>{
    for(const [invalid,status] of [
      [{...company,email:'x1@reparos.example',cnpj:'11.222.333/0001-82'},400],
      [{...company,email:'x2@reparos.example',cnpj:'00000000000000'},400],
      [{...company,email:'x3@reparos.example',razao_social:'  '},400],
      [{...company,email:'x4@reparos.example',razao_social:undefined},400],
      [{...company,email:'x5@reparos.example',cnpj:undefined,cpf:'52998224725'},400],
      [{...company,email:'x6@reparos.example',tipo_pessoa:'mei'},400],
      [{...company,email:'x7@reparos.example'},409],
    ]) {const r=await post('/api/funcionarios',invalid);assert.equal(r.status,status,JSON.stringify(invalid));assert(r.data.erro);}
    const duplicate=await post('/api/funcionarios',{...company,email:'x8@reparos.example',cnpj:'11222333000181'});
    assert.equal(duplicate.status,409);assert.match(duplicate.data.erro,/CNPJ/);
  });

  await t.test('only professionals can register as a company',async()=>{
    const {especialidade,...asClient}=company;
    const r=await post('/api/clientes',{...asClient,email:'cliente-pj@example.test'});
    assert.equal(r.status,400);assert.match(r.data.erro,/profissionais/);
  });

  await t.test('admins can correct the company name, but not for individuals',async()=>{
    ok(await request('/api/funcionarios/'+companyId,'PATCH',{razao_social:'Reparos Silva ME'},admin.cookie));
    assert.equal(ok(await request('/api/funcionarios/'+companyId,undefined,undefined,admin.cookie)).pessoa.razao_social,'Reparos Silva ME');
    assert.equal((await request('/api/funcionarios/'+companyId,'PATCH',{razao_social:'X'},admin.cookie)).status,400);
    const person=ok(await request('/api/funcionarios',undefined,undefined,admin.cookie)).find(p=>p.tipo_pessoa==='fisica');
    assert.equal((await request('/api/funcionarios/'+person.id,'PATCH',{razao_social:'Nada'},admin.cookie)).status,400);
    assert.equal((await request('/api/funcionarios/'+companyId,'PATCH',{tipo_pessoa:'fisica'},admin.cookie)).status,400);
  });
});
