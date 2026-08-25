# Expectativa Institucional da Liderança — Sebrae / MT

Questionário da **Diretoria** da Régua de Maturidade da Liderança do Sebrae / MT.
Cada membro da Diretoria define, nas 16 dimensões de liderança, o nível de
maturidade que a instituição deve esperar da sua liderança — em escala de 1 a 5
com âncoras comportamentais.

As dimensões e as âncoras vêm da aba **Diretoria** da planilha
`Regua_Maturidade_SebraeMT_BASE.xlsx` e estão em `app/survey-data.ts`.

## Diferenças em relação à pesquisa de colaboradores

Esta aplicação é uma cópia de
[`PesquisaColaboradores`](https://github.com/Patithutor/PesquisaColaboradores)
com o questionário na visão da Diretoria. Os 16 títulos e os 5 textos-âncora são
**idênticos** nas duas abas da planilha: o que muda é a pergunta, não a régua.

| | Colaboradores | Diretores (este repositório) |
| --- | --- | --- |
| Pergunta | Como o gestor **pratica** cada dimensão hoje | Que nível a instituição deve **esperar** da liderança |
| Alvo | Um líder específico do lotacionograma | A liderança do Sebrae/MT como um todo |
| Respondente | Anônimo | Identificado (nome, cargo e diretoria) |
| Campo aberto | Comentário opcional por dimensão | Não há |
| Consolidação | Média da equipe por líder | Nível esperado de consenso por dimensão |

Cada envio gera o relatório de uma única resposta. A expectativa institucional só
se fecha depois de consolidar as respostas de toda a Diretoria.

## Executar localmente

Requer Node.js 20.9 ou superior.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Verificações

```bash
npm run check
npm run build
```

## Identificação do respondente

Diferente da pesquisa de colaboradores, esta **não é anônima**: a expectativa
institucional é uma posição assumida, e sem saber quem respondeu não há como
fechar o consenso da Diretoria depois.

O formulário pede nome completo (obrigatório), diretoria ou instância
(obrigatório) e cargo (opcional). A lista de instâncias está em
`app/directorates.ts`, gerada a partir das áreas do Lotacionograma simplificado
do Sebrae/MT (05.08.2026), e também é validada no servidor. Atualize esse arquivo
quando a estrutura mudar — um rascunho salvo no navegador que aponte para uma
instância removida tem o campo limpo automaticamente, em vez de travar no envio.

## Armazenamento das respostas

Cada resposta é gravada como um JSON no **Vercel Blob**, em
`expectativas/<respondente>/<data>-<id>.json`, com o respondente, a diretoria e
os níveis esperados das 16 dimensões.

Crie o Blob store no painel do Vercel com **acesso privado** (o modo de acesso
não pode ser alterado depois da criação) e conecte-o ao projeto; o
`BLOB_READ_WRITE_TOKEN` é injetado automaticamente.

O Blob é o registro definitivo: se a geração do PDF ou o envio do e-mail falhar
depois da gravação, a resposta é preservada e o envio é confirmado normalmente.

> No Vercel, `SAVE_LOCAL_REPORTS` precisa ficar em `false`. O filesystem das
> funções é somente leitura e a gravação faria todo envio falhar.

## Baixar todas as respostas

`GET /api/respostas?token=$EXPORT_TOKEN` devolve um `.xlsx` consolidado com:

- **Resumo** — um respondente por linha, com cargo, diretoria, nível esperado
  médio e classificação, além do nível médio de toda a Diretoria;
- **Expectativa institucional** — no layout da aba `Diretoria` da régua:
  dimensões nas linhas, respondentes nas colunas, a média, o **nível esperado
  de consenso** (média arredondada para a régua de 1 a 5) e a amplitude entre o
  menor e o maior nível, que mostra onde a Diretoria ainda não convergiu;
- **Respostas** — formato longo, uma linha por dimensão respondida;
- **Escala** — níveis e faixas de classificação.

O token também pode ir no cabeçalho `Authorization: Bearer <token>`. Sem
`EXPORT_TOKEN` configurado a rota responde 503 e nunca fica aberta por descuido.

Para abrir a rota sem token — útil enquanto a pesquisa está sendo montada —
defina `EXPORT_PUBLIC=true`. Nesse modo qualquer pessoa com a URL baixa todas
as respostas, e cada download registra um aviso no log da função. Só o valor
exato `true` abre; qualquer outro valor mantém a exigência do token. Para
fechar de novo, basta remover a variável e refazer o deploy.

```bash
curl -fL "https://SEU-APP.vercel.app/api/respostas?token=SEU_TOKEN" -o consolidado.xlsx
```

## Configuração

Copie `.env.example` para `.env.local` e ajuste as variáveis.
