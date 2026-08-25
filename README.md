# Expectativa da Diretoria sobre a Liderança — Sebrae / MT

Questionário da **Diretoria** da Régua de Maturidade da Liderança do Sebrae / MT.
Para cada pessoa do lotacionograma, os membros da Diretoria definem, nas 16
dimensões de liderança, o nível de maturidade que a instituição deve esperar
dela — em escala de 1 a 5 com âncoras comportamentais. Cada dimensão tem um
comentário opcional. Assessorias respondem uma versão mais curta, com 9
dimensões (veja abaixo).

As dimensões e as âncoras vêm da aba **Diretoria** da planilha
`Regua_Maturidade_SebraeMT_BASE.xlsx` e estão em `app/survey-data.ts`.

## Diferenças em relação à pesquisa de colaboradores

Esta aplicação é uma cópia de
[`PesquisaColaboradores`](https://github.com/Patithutor/PesquisaColaboradores)
com o questionário na visão da Diretoria. Os 16 títulos e os 5 textos-âncora são
**idênticos** nas duas abas da planilha: o que muda é a pergunta, não a régua.

| | Colaboradores | Diretores (este repositório) |
| --- | --- | --- |
| Pergunta | Como o gestor **pratica** cada dimensão hoje | Que nível se deve **esperar** daquele líder |
| Primeira etapa | Seleção do líder avaliado | Igual: seleção do avaliado |
| Respondente | Anônimo | Anônimo |
| Campo aberto | Comentário opcional por dimensão | Igual: comentário opcional |
| Consolidação | Média da equipe por líder | Nível esperado de consenso por dimensão |

As duas pesquisas se consolidam pela mesma chave — o nome do líder no
lotacionograma —, o que permite comparar a prática percebida pela equipe com a
expectativa definida pela Diretoria.

Cada envio gera o relatório de uma única resposta. O nível esperado só se fecha
depois de consolidar as respostas de toda a Diretoria.

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

## Lista de líderes

O campo "Avaliado" é o mesmo combobox com busca da PesquisaColaboradores
(`app/leader-combobox.tsx`), alimentado por `app/leaders.ts`, gerado a partir do
Lotacionograma simplificado do Sebrae/MT (05.08.2026): 44 pessoas separadas
pelas 5 unidades organizacionais, na ordem do lotacionograma, com os nomes em
ordem alfabética dentro de cada uma.

Diferente da PesquisaColaboradores, aqui as **assessorias entram na lista** —
marcadas com `assessor: true` — porque a Diretoria também define expectativa
para elas.

A busca ignora acentos e caixa, e casa também com o cargo e a área — "sinop"
ou "gerente de mercado" encontram a pessoa certa. O cabeçalho de cada grupo
acompanha a rolagem, a busca esconde os grupos sem resultado e a navegação por
teclado corre a lista inteira, atravessando as fronteiras de grupo.

O nome escolhido também é validado no servidor contra essa lista. É o que
garante que todas as expectativas definidas para um mesmo gestor sejam
consolidadas juntas, sem variações de grafia.

Quando o lotacionograma mudar, atualize `app/leaders.ts` e refaça o deploy. Um
rascunho salvo no navegador que aponte para um líder removido tem o campo limpo
automaticamente, em vez de travar no envio.

## Questionário reduzido das assessorias

Assessorias não lideram equipe, então o questionário delas termina na dimensão
9, **Compromisso com resultados** — as dimensões 10 a 16 tratam de liderança de
pessoas e não se aplicam.

A regra vive em `dimensionCountFor()` (`app/leaders.ts`) e vale para toda a
aplicação: o número de etapas e a barra de progresso se ajustam, e o servidor
exige exatamente 9 níveis — nem mais, nem menos — quando o líder escolhido é
uma assessoria. Nos relatórios e no consolidado aparecem só as dimensões
respondidas.

A busca é pelo **título** da dimensão, não pela posição: se a ordem da régua
mudar, o corte continua em "Compromisso com resultados". Se esse título sumir
da régua, o questionário fica inteiro em vez de encurtar no lugar errado.

## Armazenamento das respostas

Cada resposta é gravada como um JSON no **Vercel Blob**, em
`expectativas/<avaliado>/<data>-<id>.json`. O registro guarda apenas o avaliado, os
níveis esperados e os comentários — nunca IP ou qualquer identificação de quem
respondeu.

Crie o Blob store no painel do Vercel com **acesso privado** (o modo de acesso
não pode ser alterado depois da criação) e conecte-o ao projeto; o
`BLOB_READ_WRITE_TOKEN` é injetado automaticamente.

O Blob é o registro definitivo: se a geração do PDF ou o envio do e-mail falhar
depois da gravação, a resposta é preservada e o envio é confirmado normalmente.

> No Vercel, `SAVE_LOCAL_REPORTS` precisa ficar em `false`. O filesystem das
> funções é somente leitura e a gravação faria todo envio falhar.

## Baixar todas as respostas

`GET /api/respostas?token=$EXPORT_TOKEN` devolve um `.xlsx` consolidado com:

- **Resumo** — um avaliado por linha, com número de respondentes, quantas
  dimensões se aplicam a ele, nível esperado médio e classificação na régua;
- **uma aba por avaliado** — no layout da aba `Diretoria` da régua: dimensões nas
  linhas, respondentes nas colunas (R1..Rn), a média, o **nível esperado de
  consenso** (média arredondada para a régua de 1 a 5) e a amplitude entre o
  menor e o maior nível, que mostra onde a Diretoria ainda não convergiu sobre
  aquele líder;
- **Respostas** — formato longo, uma linha por dimensão respondida, com os
  comentários;
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
