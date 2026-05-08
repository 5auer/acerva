# ACERVA — Passo a passo da demonstração

**Para usar no tablet com a bibliotecária da Cruz e Sousa e, em seguida, com a vereadora.**

---

## 1. Antes de sair de casa

| Item | Como conferir |
|---|---|
| URL pública do MVP | `https://3000-in8nx4tq6jvvr0tvnrgwg-3b94f072.us2.manus.computer` |
| Tablet em modo paisagem | Recomendado para o painel administrativo |
| Internet | Wi‑Fi da biblioteca ou roteador do celular |
| Conta Manus do dono (você) | Já é admin — login automático ao abrir |
| Conta Manus de "leitor de teste" | Use uma segunda conta (Google secundário) para simular o leitor |

> Dica: abra a URL no Chrome do tablet e adicione à tela inicial — fica com cara de aplicativo e é mais fácil para a bibliotecária no dia a dia.

---

## 2. Roteiro de apresentação (≈ 10 minutos)

A apresentação tem três blocos, na ordem em que a bibliotecária e a vereadora entendem melhor: **morador → leitor → bibliotecária**.

### Bloco A — A experiência do morador (catálogo público)

1. **Abra a Home (`/`)**. Mostre o título "O acervo da Biblioteca Cruz e Sousa ao seu alcance" — branding institucional.
2. **Pesquise um livro pelo nome**: digite "Machado" no campo de busca. A lista filtra em tempo real e mostra disponibilidade ("3 de 3 disponíveis").
3. **Filtre por categoria**: clique em "Lit. Brasileira" e depois em "Cidade de Schroeder". Mostre que há um livro local no acervo.
4. **Marque "Apenas disponíveis agora"**: a lista some os livros sem exemplar livre. *Mensagem-chave: o morador descobre de casa o que pode buscar.*
5. **Clique em uma obra** (ex.: *Dom Casmurro*). A página de detalhes mostra autor, categoria, descrição, ano e número de exemplares disponíveis.

### Bloco B — A experiência do leitor (cadastro com verificação)

1. **Volte para a Home, clique em "Minha conta"** no topo. Como ainda não está logado, o sistema redireciona para o login Manus (OAuth real).
2. **Faça login com a conta de leitor de teste**.
3. Em "Minha conta", **preencha o formulário de cadastro**: nome completo, CPF, telefone, endereço.
4. **Faça upload de dois "documentos"** (qualquer foto serve para o teste — RG/CNH e comprovante de endereço).
5. **Mostre o status: "Cadastro em análise"**. Explique: *"Aqui na vida real é a bibliotecária que aprova — segurança e LGPD."*

### Bloco C — A experiência da bibliotecária (painel administrativo)

> Para isso, **troque para a sua conta de admin** (logout no canto superior direito → login com sua conta principal).

1. **Clique em "Painel da Bibliotecária"** no menu. Mostre as 4 abas:
   - **Visão Geral**: total de livros, exemplares, leitores, empréstimos ativos, atrasos.
   - **Verificações**: aparece o leitor recém‑cadastrado, com os dois documentos. Clique em "Aprovar". *"Pronto, ele agora pode pegar livros."*
   - **Acervo**: cadastre uma obra ao vivo (título, autor, categoria, descrição) e clique em "Adicionar exemplar". O número de cópias atualiza na hora.
   - **Empréstimos**:
     1. Cole o CPF do leitor de teste e clique em "Buscar leitor".
     2. Escolha um livro, registre o empréstimo. O sistema mostra a data de devolução automática (15 dias).
     3. Clique em "Registrar devolução" no mesmo empréstimo. Como está no prazo, retorna sem multa.

### Encerramento (mensagens-chave para a vereadora)

- **"O acervo da biblioteca passa a estar disponível para todo morador de Schroeder, 24 horas por dia."**
- **"A bibliotecária ganha uma ferramenta simples, em português, pensada para tablet — não precisa de treinamento técnico."**
- **"As regras já estão automatizadas: 15 dias de prazo, máximo de 3 livros, 2 renovações, bloqueio automático quem atrasa."**
- **"O sistema foi projetado para crescer: hoje atende a Cruz e Sousa, amanhã pode atender outras bibliotecas municipais da região (modelo SaaS)."**

---

## 3. Cenários adicionais (se sobrar tempo / curiosidade)

| Cenário | Como reproduzir |
|---|---|
| Atraso bloqueia leitor | Crie um empréstimo, depois peça para a equipe ajustar a data de vencimento no banco para o passado, e devolva. Aparece "X dia(s) de atraso" e o leitor fica bloqueado. |
| Tentar emprestar para leitor não verificado | Faça login com uma terceira conta, **não** complete a verificação, e peça à bibliotecária para tentar emprestar — o sistema bloqueia com mensagem clara. |
| Tentar emprestar 4 livros | Empreste 3 livros para o mesmo leitor; ao tentar o 4º, o sistema recusa com "Limite de 3 livros simultâneos". |
| Renovar | Em "Minha conta", clique em "Renovar" em um empréstimo: data nova = +15 dias. Após 2 renovações, o botão fica desabilitado. |

---

## 4. Recuperando o tablet se algo travar

- **Página piscou ou ficou em branco**: pull-to-refresh ou recarregar a aba.
- **Login não voltou**: feche a aba e clique no link novamente. O cookie é reemitido.
- **Dados sumiram**: o banco é único e persistente, então isso não acontece — se acontecer, me avise que eu rodo `seedDemoData` de novo (idempotente).
- **Quer começar do zero**: peça que eu reverta para o checkpoint `d3daaf1f` (fica salvo no histórico) — recupera estado limpo sem perder código.

---

## 5. O que dizer se a vereadora perguntar...

- **"Custa quanto para implantar?"** → "Implantação inicial entre R$ 35.000 e R$ 60.000 (dentro do limite de dispensa de licitação), suporte mensal de R$ 800 a R$ 2.000. Esses valores entram no Termo de Referência que vou ajudar a estruturar."
- **"Os dados ficam onde?"** → "Hoje em ambiente de demonstração na nuvem; em produção, podem ficar em servidor da Prefeitura ou em provedor brasileiro com cláusula LGPD."
- **"Outras bibliotecas da região podem usar?"** → "Sim. A arquitetura é multi-biblioteca por desenho: cada biblioteca tem seus dados isolados, mas compartilham o mesmo software, o que reduz custo por município."
- **"E se você sair?"** → "O código é seu (entrego repositório no GitHub). A Prefeitura pode contratar qualquer outra empresa para manter — não fica refém de mim."

---

## 6. Suporte rápido

- Repositório/código: `/home/ubuntu/acerva` (também publicável no GitHub privado a qualquer momento)
- 29 testes automatizados rodando: `pnpm test`
- Stack: **Next.js (React 19)** + **tRPC** + **PostgreSQL/Drizzle** + **Tailwind 4**

---

**Boa apresentação. Confia no produto que você está levando — ele está pronto para uma conversa séria.**
