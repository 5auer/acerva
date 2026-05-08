# ACERVA - Biblioteca Pública Cruz e Sousa - TODO

Sistema de gestão da Biblioteca Pública Municipal Cruz e Sousa de Schroeder/SC.

## Banco de Dados (drizzle/schema.ts)

- [x] Tabela `categories` (categorias de livros)
- [x] Tabela `books` (obra: título, autor, descrição, categoria)
- [x] Tabela `book_copies` (exemplares físicos individuais)
- [x] Tabela `user_profiles` (CPF, telefone, endereço, status de verificação, bloqueio)
- [x] Tabela `verification_documents` (RG/CPF e comprovante de residência enviados)
- [x] Tabela `loans` (empréstimos com prazo e renovações)
- [x] Estender `users` com campos de perfil (sem quebrar OAuth existente)

## Backend (server/routers.ts + server/db.ts)

- [x] `catalog.search` - busca pública por título/autor/categoria com disponibilidade
- [x] `catalog.getBook` - detalhes completos do livro
- [x] `catalog.listCategories` - listar categorias
- [x] `profile.submitVerification` - usuário envia documentos
- [x] `profile.me` - retorna perfil + status de verificação + bloqueio
- [x] `loans.myActive` - empréstimos ativos do usuário
- [x] `loans.renew` - renovar empréstimo (máx 2 renovações)
- [x] `admin.pendingVerifications` - lista verificações pendentes
- [x] `admin.approveVerification` - aprovar usuário
- [x] `admin.rejectVerification` - rejeitar usuário
- [x] `admin.listBooks` - lista todos os livros
- [x] `admin.createBook` - cadastrar nova obra
- [x] `admin.addCopy` - adicionar exemplar
- [x] `admin.findUserByCpf` - buscar usuário para empréstimo
- [x] `admin.createLoan` - registrar empréstimo (valida verificação, limite 3, disponibilidade)
- [x] `admin.activeLoans` - lista todos empréstimos ativos
- [x] `admin.returnLoan` - registrar devolução (calcula atraso, bloqueia se necessário)
- [x] `admin.unblockUser` - desbloquear leitor após período
- [x] `admin.stats` - estatísticas gerais
- [x] `admin.seedDemoData` - popular acervo com livros reais (idempotente)

## Frontend - Páginas Públicas

- [x] `/` - Home com busca elegante (catálogo) e branding Cruz e Sousa
- [x] `/livros/:id` - Detalhes do livro
- [x] `/minha-conta` - Cadastro de perfil + upload de documentos (após login OAuth)
- [x] Login via OAuth Manus integrado ao header

## Frontend - Área do Usuário

- [x] `/minha-conta` - Status verificação, perfil, lista empréstimos ativos, renovar

## Frontend - Painel Administrativo

- [x] `/admin` - Dashboard com estatísticas (visão geral)
- [x] `/admin` - Aba Verificações pendentes (aprovar/rejeitar)
- [x] `/admin` - Aba Acervo (cadastro + adição de exemplares)
- [x] `/admin` - Aba Empréstimos (registrar empréstimo via CPF + devolver)

## Design / UX

- [x] Paleta elegante (verde acervo + dourado discreto + neutros)
- [x] Tipografia serif para títulos (Playfair) + sans para texto (Inter)
- [x] Layout responsivo otimizado para tablet (toques grandes, leitura clara)
- [x] Estados de loading e empty bem cuidados
- [x] Header com identidade da Biblioteca Cruz e Sousa
- [x] Rodapé institucional Schroeder/SC

## Seed de Dados

- [x] 8 categorias (Lit. Brasileira, Lit. Estrangeira, Infantojuvenil, História, Romance, Poesia, Educação, Cidade de Schroeder)
- [x] 15 livros reais com autores brasileiros e clássicos (incluindo título regional sobre Schroeder)
- [x] 31 exemplares distribuídos pelos livros (1 a 3 por título)

## Testes (vitest) — 29/29 passando

- [x] `acerva.rules.test.ts` - constantes do produto (15 dias, 2 renovações, 3 simultâneos)
- [x] `acerva.rules.test.ts` - `addDaysToDate` (sem mutação, prazo correto)
- [x] `acerva.rules.test.ts` - `diffDaysFloor` (sem atraso, atraso, fração)
- [x] `acerva.rules.test.ts` - fluxo simulado (criação → renovação → devolução com atraso)
- [x] `acerva.rules.test.ts` - validação de formato de CPF
- [x] `acerva.loans.test.ts` - `admin.createLoan` valida verificado/bloqueado/limite/disponibilidade/role
- [x] `acerva.loans.test.ts` - `loans.renew` aplica MAX_RENEWALS, atraso e dono
- [x] `acerva.loans.test.ts` - `admin.returnLoan` calcula atraso e bloqueia automaticamente
- [x] `auth.logout.test.ts` - logout limpa cookie

## Validações Críticas

- [x] Usuário deve estar verificado para emprestar
- [x] Limite de 3 livros simultâneos por leitor
- [x] Prazo automático de 15 dias
- [x] Renovação adiciona +15 dias (máx 2x)
- [x] Atraso > 0 dias bloqueia usuário automaticamente na devolução
- [x] Bloqueio impede novos empréstimos
- [x] Apenas a bibliotecária (admin) registra empréstimos e devoluções
- [x] Apenas a bibliotecária aprova/rejeita verificação de leitores

## Pós-MVP (a discutir com a bibliotecária / Prefeitura)

- [ ] Reservas online (fila de espera por exemplar)
- [ ] Catálogo importado de planilha existente (CSV)
- [ ] Política de multa monetária (hoje só bloqueio)
- [ ] Renovação direta pelo leitor (hoje a bibliotecária aprova via WhatsApp)
- [ ] Modo SaaS multi-biblioteca (estrutura prevista, mas não ativada)
- [x] Capa dos livros (upload via admin) — implementado em v1.2


## Gestão de categorias

- [x] Mutation `admin.createCategory` exposta no router
- [x] Aba "Categorias" no painel admin: listar + criar nova categoria
- [x] Botão "Nova categoria" dentro do modal de cadastro de livro (com criação inline)
- [x] Teste vitest da nova mutation `admin.createCategory`
- [x] Validação de status, checkpoint e entrega


## Capa de livro 4:5

- [x] Migration: adicionar coluna coverUrl em books
- [x] Mutation admin.setBookCover (arquivo base64, URL externa, clear)
- [x] Componente CoverPicker (arquivo/câmera/URL) com preview 4:5
- [x] Botão "Capa" para edição posterior em cada linha do acervo
- [x] Card do catálogo público mostra capa 4:5 (fallback elegante)
- [x] Página de detalhes do livro mostra capa 4:5
- [x] Painel admin lista capa em miniatura por linha
- [x] Testes vitest: 7 casos cobrindo URL, dataURL, clear, formato inválido, slug e validação
- [x] Pós-MVP "Capa dos livros (upload via admin)" implementado nesta versão

## Pós-MVP que ainda restam (não bloqueiam apresentação)

- [x] Passo-a-passo de jornada do usuário (markdown) — `JORNADA_USUARIO.md`
