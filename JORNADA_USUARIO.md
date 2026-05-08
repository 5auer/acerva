# ACERVA — Jornada do Usuário

> Roteiro prático para você percorrer no tablet com a bibliotecária da **Biblioteca Pública Municipal Cruz e Sousa** e, depois, com a vereadora.
>
> **URL pública:** `https://acervabib-s7h5fsvk.manus.space`
>
> Sugestão: faça a jornada **na ordem abaixo**, sem pular passos. Cada etapa demora menos de 1 minuto.

---

## 🎭 Personagens da demonstração

Você vai precisar de **dois logins diferentes** para mostrar os dois lados:

| Papel | Quem usa | O que faz |
|---|---|---|
| **Bibliotecária** | Sua conta Manus (já é admin) | Aprova cadastros, registra empréstimos, devoluções, cadastra livros e categorias |
| **Leitor** | Uma segunda conta Manus (Google secundário ou e‑mail alternativo) | Faz cadastro, envia documentos, vê empréstimos ativos |

> Dica: abra **duas janelas anônimas** lado a lado, ou use o tablet (leitor) + o seu notebook (bibliotecária). Fica mais natural.

---

## 🟢 PARTE 1 — Cidadão descobre o acervo (sem precisar de login)

**Objetivo:** mostrar que qualquer morador de Schroeder pode pesquisar de casa.

1. Abra `https://acervabib-s7h5fsvk.manus.space` em uma aba anônima.
2. Você cai direto na home com a frase **"O acervo da Biblioteca Cruz e Sousa ao seu alcance."**.
3. **Digite "Machado"** na busca → toque em **Buscar**.
4. Filtre por categoria **Lit. Brasileira** → o catálogo se reorganiza em tempo real.
5. Marque **"Apenas disponíveis agora"** → some o que está emprestado.
6. Toque em um livro (ex.: **Dom Casmurro**) → abre a **página de detalhes** com capa 4:5, descrição, autor, exemplares disponíveis e ano.
7. Volte para o catálogo com **"Voltar ao catálogo"**.

> **O que isso prova:** a comunidade não precisa mais ir até a biblioteca para saber se o livro existe e está disponível. Resolve o problema central que você levantou para a vereadora.

---

## 🟡 PARTE 2 — Leitor faz cadastro (passo do cidadão)

**Objetivo:** mostrar que o leitor faz tudo de casa, e a bibliotecária só **aprova**.

1. Toque em **"Minha conta"** no topo.
2. Toque em **"Entrar com Manus"** → faça login com a **conta secundária**.
3. Aparece o formulário **"Complete seu cadastro de leitor"**.
4. Preencha:
   - Nome completo
   - CPF (use formato `123.456.789-09` ou só números)
   - Telefone com DDD
   - Endereço completo
5. Em **"Documento de identidade"**: toque para enviar uma foto (no tablet, abre a **câmera nativa** automaticamente). Tire foto de qualquer documento de demonstração.
6. Em **"Comprovante de residência"**: mesma coisa.
7. Toque em **"Enviar para análise"**.
8. A tela muda para **status "Em análise"** com mensagem clara: *"Sua bibliotecária vai conferir os documentos."*

> **O que isso prova:** o cadastro é 100% digital. A bibliotecária não precisa digitar nada — só conferir.

---

## 🔵 PARTE 3 — Bibliotecária aprova o leitor

**Objetivo:** mostrar como a bibliotecária trabalha. Use o seu login admin.

1. Em outra aba, abra o site logado **com a sua conta** (admin).
2. Vá em **"Painel da Bibliotecária"**.
3. A primeira aba é **Visão Geral** — mostra estatísticas (total de leitores, verificações pendentes, empréstimos ativos, atrasos, livros e exemplares).
4. Toque em **"Verificações"** → o leitor que você acabou de criar aparece com um cartão.
5. Toque em **"Ver documentos"** → expande as duas fotos para conferir.
6. Toque em **"Aprovar leitor"** → toast confirma.

> **O que isso prova:** o controle continua na mão da bibliotecária. Nenhum cadastro vira leitor sem ela conferir.

---

## 🟣 PARTE 4 — Bibliotecária registra empréstimo

**Objetivo:** mostrar o fluxo de balcão (a bibliotecária no momento da retirada).

1. No painel admin, toque em **"Novo empréstimo"**.
2. Digite o **CPF do leitor** que acabou de aprovar → toque em **Buscar**.
3. O cartão do leitor aparece com nome, status verificado e quantos empréstimos ativos tem.
4. Selecione o livro **Dom Casmurro** na lista do acervo (aparece a quantidade disponível).
5. Toque em **"Registrar empréstimo"**.
6. Toast confirma com a data de devolução (15 dias à frente).

> **O que isso prova:**
> - Sistema bloqueia se o leitor não estiver verificado
> - Sistema bloqueia se já tem 3 empréstimos ativos
> - Sistema bloqueia se o leitor está em punição por atraso
> - Sistema só libera exemplar realmente disponível
> - Tudo automático. Zero risco de erro humano.

---

## 🟠 PARTE 5 — Leitor vê o empréstimo dele

1. Volte na aba do **leitor** (recarregue se precisar).
2. Em **"Minha conta"**, agora aparece a seção **"Meus empréstimos ativos"**.
3. Mostra o livro, a data de retirada, a data de devolução prevista e quantas renovações restam (começa em 2).
4. Toque em **"Renovar"** → confirma → a data de devolução pula 15 dias para frente e mostra "1 renovação restante".
5. Toque em **"Renovar"** de novo → última renovação aplicada → o botão fica desabilitado.

> **O que isso prova:** leitor acompanha tudo de casa. Limite de 2 renovações é automático (regra que você confirmou com a bibliotecária).

---

## 🔴 PARTE 6 — Devolução com atraso e bloqueio automático

**Objetivo:** mostrar como o sistema **protege o acervo**.

1. Volte no painel da bibliotecária → aba **"Empréstimos ativos"**.
2. Localize o empréstimo do leitor demo.
3. Toque em **"Registrar devolução"**.
4. Se houver atraso (você pode demonstrar isso baixando manualmente a data via SQL no Database Studio, ou só explicar o fluxo): o sistema calcula os **dias de atraso** e **bloqueia automaticamente** o leitor pelo mesmo período.
5. Mostre que o cartão do leitor agora aparece com selo **"Bloqueado"** e a data até quando o bloqueio vai durar.
6. Toque em **"Desbloquear"** se quiser mostrar a reversão manual (a bibliotecária tem o controle final).

> **O que isso prova:** disciplina automática, sem a bibliotecária precisar bater de frente com o leitor.

---

## 🟤 PARTE 7 — Bibliotecária cadastra um livro novo COM CAPA

**Objetivo:** mostrar a parte mais "uau" para a vereadora.

1. No painel admin, vá em **"Acervo"**.
2. Toque em **"Cadastrar novo livro"**.
3. Preencha título, autor.
4. Em **Categoria**, mostre os dois caminhos:
   - Selecionar uma categoria existente OU
   - Tocar em **"+ Nova categoria"** (criar "Autoajuda" na hora) → ela aparece já selecionada
5. Em **Capa**, mostre as **3 opções** do componente:
   - **Tirar foto** → no tablet abre a **câmera nativa** → tira foto da capa real do livro físico.
   - **Escolher arquivo** → abre a galeria.
   - **Colar URL** → cola um link de capa da Amazon ou OpenLibrary.
6. Veja o **preview 4:5 elegante** atualizando.
7. Quantidade de exemplares: 2.
8. Toque em **"Salvar livro"**.
9. Mostre o livro **aparecendo no catálogo público** com a capa que você acabou de tirar.

> **O que isso prova:** a bibliotecária consegue catalogar um livro físico em **menos de 30 segundos**, com a câmera do próprio tablet.

---

## 🟢 PARTE 8 — Editar a capa de um livro depois

**Objetivo:** mostrar que nada fica preso.

1. Na lista do acervo, toque em **"Capa"** ao lado de qualquer livro.
2. Mude a capa (foto nova, arquivo ou URL).
3. Veja o catálogo público atualizar instantaneamente.

---

## ⚙️ Bastidores que você pode citar para a vereadora

| Pergunta provável | Resposta curta |
|---|---|
| "Quanto custa para a Prefeitura?" | A construção do MVP já está paga (foi feito gratuitamente para apresentar). Para virar contratação pública: implantação ~R$ 35–60 mil + manutenção ~R$ 800–2.000/mês. |
| "Os dados dos leitores estão seguros?" | LGPD: documentos ficam em armazenamento privado, só a bibliotecária aprova. Senhas via OAuth (Google/Manus), não guardamos senha. |
| "Funciona offline?" | Não, é online. Mas a bibliotecária pode continuar atendendo no balcão se a internet cair. O sistema é um apoio, não um substituto. |
| "E se a Prefeitura quiser sair desse fornecedor amanhã?" | Código pode virar open source no GitHub. Banco PostgreSQL exportável. Sem amarra. |
| "Funciona em outras bibliotecas da região?" | A arquitetura já é multi‑biblioteca (modo SaaS desenhado). Pode escalar para Jaraguá do Sul, Guaramirim, Massaranduba. |
| "Quanto tempo até estar em produção?" | O MVP já está rodando online. Para virar produção oficial da Prefeitura: 2–3 semanas para migração de acervo + treinamento. |

---

## ✅ Checklist final antes da reunião

- [ ] Tablet com bateria cheia
- [ ] Wi‑Fi do local testado (ou 4G de backup)
- [ ] Site abrindo: `https://acervabib-s7h5fsvk.manus.space`
- [ ] Você logado como **admin** em uma aba
- [ ] Conta secundária pronta para o papel de leitor
- [ ] Documento de demonstração para fotografar (qualquer papel serve)
- [ ] Um livro físico em mãos para cadastrar com capa real
- [ ] Este roteiro aberto no celular para consulta rápida

---

**Boa apresentação. Esse MVP foi pensado para a Cruz e Sousa, e mostra na prática que dá para resolver com elegância e baixo custo.**
