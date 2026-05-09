# Catálogo de Skills, MCPs e Agentes de IA

> Índice principal. Aponte para qualquer item e diga "instala isso no meu projeto" — eu faço o resto.

---

## Como usar

- **Skills Claude:** instaladas em `~/.claude/skills/` (global) ou `.claude/skills/` (projeto)
- **MCP Servers:** configurados em `~/.claude/claude_desktop_config.json` ou `claude.json`
- **Frameworks/Repos:** clonados e configurados no projeto conforme necessário

---

## PARTE 1 — SKILLS DO CLAUDE

### Documentos & Escritório
| # | Nome | O que faz | Pasta |
|---|------|-----------|-------|
| 01 | PDF | Lê, extrai tabelas, preenche formulários, mescla/divide PDFs | [skills/documentos/pdf](skills/documentos/pdf.md) |
| 02 | DOCX | Cria e edita documentos Word com controle de alterações | [skills/documentos/docx](skills/documentos/docx.md) |
| 03 | PPTX | Apresentações a partir de linguagem natural | [skills/documentos/pptx](skills/documentos/pptx.md) |
| 04 | XLSX | Fórmulas, análises, gráficos via linguagem natural | [skills/documentos/xlsx](skills/documentos/xlsx.md) |
| 05 | Doc Coauthoring | Escrita colaborativa humano + Claude em vai-e-vem | [skills/documentos/doc-coauthoring](skills/documentos/doc-coauthoring.md) |

### Design & Criatividade
| # | Nome | O que faz | Pasta |
|---|------|-----------|-------|
| 06 | Frontend Design | UI com sistemas de design reais, tipografia — 277k instalações | [skills/design/frontend-design](skills/design/frontend-design.md) |
| 07 | Canvas Design | Gráficos sociais, pôsteres, capas → PNG/PDF | [skills/design/canvas-design](skills/design/canvas-design.md) |
| 08 | Algorithmic Art | Arte fractal e geométrica via p5.js | [skills/design/algorithmic-art](skills/design/algorithmic-art.md) |
| 09 | Theme Factory | Esquemas de cores em lote a partir de um prompt | [skills/design/theme-factory](skills/design/theme-factory.md) |
| 10 | Web Artifacts Builder | Calculadoras, dashboards via linguagem natural | [skills/design/web-artifacts-builder](skills/design/web-artifacts-builder.md) |

### Desenvolvimento & Engenharia
| # | Nome | O que faz | Pasta |
|---|------|-----------|-------|
| 11 | Superpowers | 20+ skills: TDD, debug, planejamento → execução (96k ⭐) | [skills/desenvolvimento/superpowers](skills/desenvolvimento/superpowers.md) |
| 12 | Systematic Debugging | Root cause primeiro, fix depois — metodologia 4 fases | [skills/desenvolvimento/systematic-debugging](skills/desenvolvimento/systematic-debugging.md) |
| 13 | File Search | Ripgrep + ast-grep para busca precisa em código | [skills/desenvolvimento/file-search](skills/desenvolvimento/file-search.md) |
| 14 | Context Optimization | Reduz custo de tokens, cache KV (13.9k ⭐) | [skills/desenvolvimento/context-optimization](skills/desenvolvimento/context-optimization.md) |
| 15 | Skill Creator | Meta-skill: cria SKILL.md a partir de descrição de workflow | [skills/desenvolvimento/skill-creator](skills/desenvolvimento/skill-creator.md) |
| 16 | Remotion Best Practices | Geração de vídeo por IA (117k instalações semanais) | [skills/desenvolvimento/remotion](skills/desenvolvimento/remotion.md) |

### Marketing & SEO
| # | Nome | O que faz | Pasta |
|---|------|-----------|-------|
| 17 | Marketing Skills | 20+ skills: CRO, copywriting, SEO, e-mail, growth | [skills/marketing/marketing-skills](skills/marketing/marketing-skills.md) |
| 18 | Claude SEO | Auditorias completas de sites, validação de schema | [skills/marketing/claude-seo](skills/marketing/claude-seo.md) |
| 19 | Brand Guidelines | Codifica sua marca em skill — aplica em todos os lugares | [skills/marketing/brand-guidelines](skills/marketing/brand-guidelines.md) |

### Conhecimento & Aprendizado
| # | Nome | O que faz | Pasta |
|---|------|-----------|-------|
| 20 | NotebookLM Integration | Bridge Claude + NotebookLM, resumos, mapas mentais | [skills/conhecimento/notebooklm](skills/conhecimento/notebooklm.md) |
| 21 | Obsidian Skills | Tag automática, linkagem automática, nativo do vault | [skills/conhecimento/obsidian](skills/conhecimento/obsidian.md) |
| 22 | Excel MCP Server | Manipula Excel sem precisar ter o Excel instalado | [skills/conhecimento/excel-mcp](skills/conhecimento/excel-mcp.md) |

---

## PARTE 2 — SERVIDORES MCP INDISPENSÁVEIS

| Nome | O que faz | Pasta |
|------|-----------|-------|
| Tavily | Busca web estruturada para agentes (não links, dados limpos) | [mcp/tavily](mcp/tavily.md) |
| Context7 | Injeta docs atualizadas de libs no contexto (Next.js, React, etc.) | [mcp/context7](mcp/context7.md) |
| Task Master AI | PRD → tarefas estruturadas com dependências → Claude executa | [mcp/task-master](mcp/task-master.md) |

---

## PARTE 3 — FRAMEWORKS & REPOSITÓRIOS

### Orquestração de Agentes
| # | Nome | O que faz | Pasta |
|---|------|-----------|-------|
| 23 | OpenClaw | Agente viral, persistente, multicanal, escreve próprias skills (210k ⭐) | [frameworks/agentes/openclaw](frameworks/agentes/openclaw.md) |
| 24 | AutoGPT | Plataforma completa para tarefas de longa duração | [frameworks/agentes/autogpt](frameworks/agentes/autogpt.md) |
| 25 | LangGraph | Agentes como grafos, orquestração multiagente (26.8k ⭐) | [frameworks/agentes/langgraph](frameworks/agentes/langgraph.md) |
| 26 | OWL | Cooperação multiagente, lidera benchmark GAIA | [frameworks/agentes/owl](frameworks/agentes/owl.md) |
| 27 | Dify | Builder de apps LLM: workflows, RAG, agentes | [frameworks/agentes/dify](frameworks/agentes/dify.md) |
| 28 | CrewAI | Multiagente com funções, objetivos, backstories | [frameworks/agentes/crewai](frameworks/agentes/crewai.md) |
| 29 | CopilotKit | Copilots de IA em apps React | [frameworks/agentes/copilotkit](frameworks/agentes/copilotkit.md) |

### IA Local
| # | Nome | O que faz | Pasta |
|---|------|-----------|-------|
| 30 | Ollama | LLMs locais com um comando | [frameworks/ia-local/ollama](frameworks/ia-local/ollama.md) |
| 31 | Open WebUI | Interface tipo ChatGPT auto-hospedada | [frameworks/ia-local/open-webui](frameworks/ia-local/open-webui.md) |
| 32 | LlamaFile | LLM como executável único — zero dependências | [frameworks/ia-local/llamafile](frameworks/ia-local/llamafile.md) |
| 33 | Unsloth | Fine-tune 2x mais rápido, 70% menos memória | [frameworks/ia-local/unsloth](frameworks/ia-local/unsloth.md) |

### Workflow & Automação
| # | Nome | O que faz | Pasta |
|---|------|-----------|-------|
| 34 | n8n | Automação open-source, 400+ integrações + nós de IA | [frameworks/workflow/n8n](frameworks/workflow/n8n.md) |
| 35 | Langflow | Visual drag-and-drop para pipelines de agentes (140k ⭐) | [frameworks/workflow/langflow](frameworks/workflow/langflow.md) |
| 36 | Huginn | Agentes web auto-hospedados, monitoramento, foco privacidade | [frameworks/workflow/huginn](frameworks/workflow/huginn.md) |

### Busca & Dados
| # | Nome | O que faz | Pasta |
|---|------|-----------|-------|
| 37 | GPT Researcher | Pesquisa autônoma → relatórios compilados | [frameworks/dados/gpt-researcher](frameworks/dados/gpt-researcher.md) |
| 38 | Firecrawl | Qualquer site → dados prontos para LLM | [frameworks/dados/firecrawl](frameworks/dados/firecrawl.md) |
| 39 | Vanna AI | Linguagem natural → SQL | [frameworks/dados/vanna](frameworks/dados/vanna.md) |

### Ferramentas de Desenvolvimento
| # | Nome | O que faz | Pasta |
|---|------|-----------|-------|
| 40 | Codebase Memory MCP | Codebase → grafo de conhecimento persistente | [frameworks/dev/codebase-memory](frameworks/dev/codebase-memory.md) |
| 41 | DSPy | Programe (não faça prompt) modelos fundacionais | [frameworks/dev/dspy](frameworks/dev/dspy.md) |
| 42 | Spec Kit | Dev orientado a especificações — escreve spec, IA gera código (50k ⭐) | [frameworks/dev/spec-kit](frameworks/dev/spec-kit.md) |
| 43 | NVIDIA NemoClaw | Sandbox seguro para agentes autônomos | [frameworks/dev/nemoclaw](frameworks/dev/nemoclaw.md) |

---

## PARTE 4 — PROJETOS ESPECIAIS (40 repos emergentes)

### Orquestração Multi-Agente
| Nome | O que faz | Pasta |
|------|-----------|-------|
| gstack | Claude Code como equipe de engenharia virtual | [especiais/orquestracao/gstack](especiais/orquestracao/gstack.md) |
| cmux | Múltiplos agentes Claude em paralelo | [especiais/orquestracao/cmux](especiais/orquestracao/cmux.md) |
| figaro | Orquestra frotas de agentes Claude no desktop | [especiais/orquestracao/figaro](especiais/orquestracao/figaro.md) |
| claude-squad | Agentes de terminal em sessões paralelas | [especiais/orquestracao/claude-squad](especiais/orquestracao/claude-squad.md) |
| deer-flow | Sub-agentes e sandboxes via skills (ByteDance) | [especiais/orquestracao/deer-flow](especiais/orquestracao/deer-flow.md) |
| SWE-AF | Uma chamada de API → equipe de engenharia | [especiais/orquestracao/swe-af](especiais/orquestracao/swe-af.md) |
| AIlice | Tarefas complexas → agentes dinâmicos | [especiais/orquestracao/ailice](especiais/orquestracao/ailice.md) |
| Agent Alchemy | Claude Code + plugins + gerenciador de tarefas | [especiais/orquestracao/agent-alchemy](especiais/orquestracao/agent-alchemy.md) |

### Infraestrutura & Segurança
| Nome | O que faz | Pasta |
|------|-----------|-------|
| Ghost OS | Agentes de IA operam todos os apps do Mac | [especiais/seguranca/ghost-os](especiais/seguranca/ghost-os.md) |
| e2b/desktop | Desktops virtuais isolados para agentes | [especiais/seguranca/e2b-desktop](especiais/seguranca/e2b-desktop.md) |
| container-use | Ambientes conteinerizados para agentes (Dagger) | [especiais/seguranca/container-use](especiais/seguranca/container-use.md) |
| Canopy | Malha P2P criptografada para agentes | [especiais/seguranca/canopy](especiais/seguranca/canopy.md) |
| agent-governance-toolkit | Middleware de segurança para agentes (Microsoft) | [especiais/seguranca/agent-governance](especiais/seguranca/agent-governance.md) |
| claude-code-security-review | PRs analisados em busca de vulnerabilidades (Anthropic) | [especiais/seguranca/security-review](especiais/seguranca/security-review.md) |
| promptfoo | Teste de segurança automatizado para modelos de IA | [especiais/seguranca/promptfoo](especiais/seguranca/promptfoo.md) |

### Memória & Contexto
| Nome | O que faz | Pasta |
|------|-----------|-------|
| Mem9 | Sistema de memória para agentes de IA | [especiais/memoria/mem9](especiais/memoria/mem9.md) |
| Codefire | Memória persistente para agentes de codificação | [especiais/memoria/codefire](especiais/memoria/codefire.md) |
| Memobase | Memória de perfil de usuário para LLMs | [especiais/memoria/memobase](especiais/memoria/memobase.md) |

### Agentes de Codificação
| Nome | O que faz | Pasta |
|------|-----------|-------|
| Qwen Code | Agente de codificação de terminal pelo QwenLM | [especiais/codificacao/qwen-code](especiais/codificacao/qwen-code.md) |
| gptme | Agente de IA pessoal no terminal | [especiais/codificacao/gptme](especiais/codificacao/gptme.md) |
| Claude Inspector | Vê mecânicas ocultas de prompt do Claude Code | [especiais/codificacao/claude-inspector](especiais/codificacao/claude-inspector.md) |
| TDD Guard | Impõe test-first para agentes de IA | [especiais/codificacao/tdd-guard](especiais/codificacao/tdd-guard.md) |
| rendergit | Repo Git → arquivo único para LLMs (Karpathy) | [especiais/codificacao/rendergit](especiais/codificacao/rendergit.md) |
| autoresearch | Sistema autônomo de treinamento de LLM (Karpathy) | [especiais/codificacao/autoresearch](especiais/codificacao/autoresearch.md) |
| pydantic-ai | Framework de agente com segurança de tipo | [especiais/codificacao/pydantic-ai](especiais/codificacao/pydantic-ai.md) |
| claude-deep-research | Pesquisa em 8 fases com continuação automática | [especiais/codificacao/deep-research](especiais/codificacao/deep-research.md) |

### MCP & Integrações
| Nome | O que faz | Pasta |
|------|-----------|-------|
| MCP Playwright | Automação de navegador para LLMs | [especiais/mcp/playwright](especiais/mcp/playwright.md) |
| stealth-browser-mcp | Automação de navegador indetectável | [especiais/mcp/stealth-browser](especiais/mcp/stealth-browser.md) |
| fastmcp | Servidores MCP com mínimo de Python | [especiais/mcp/fastmcp](especiais/mcp/fastmcp.md) |
| markdownify-mcp | PDFs, imagens, áudio → Markdown | [especiais/mcp/markdownify](especiais/mcp/markdownify.md) |
| MCPHub | Gerencia múltiplos servidores MCP via HTTP | [especiais/mcp/mcphub](especiais/mcp/mcphub.md) |

### Busca, Dados & LLM Tools
| Nome | O que faz | Pasta |
|------|-----------|-------|
| CK | Busca código por significado, não palavras-chave | [especiais/dados/ck](especiais/dados/ck.md) |
| ExtractThinker | ORM para inteligência de documentos | [especiais/dados/extract-thinker](especiais/dados/extract-thinker.md) |
| OmniRoute | Proxy de API para 44+ provedores de IA | [especiais/dados/omniroute](especiais/dados/omniroute.md) |
| dlt | Pipelines de dados nativos para LLM (5000+ fontes) | [especiais/dados/dlt](especiais/dados/dlt.md) |
| simonw/llm | CLI leve para LLMs locais e remotos | [especiais/dados/simonw-llm](especiais/dados/simonw-llm.md) |
| Portkey-AI/gateway | Roteie para 250+ LLMs | [especiais/dados/portkey](especiais/dados/portkey.md) |
| lmnr | Rastreie e avalie comportamento de agentes | [especiais/dados/lmnr](especiais/dados/lmnr.md) |

### Vídeo & Outros
| Nome | O que faz | Pasta |
|------|-----------|-------|
| LTX-Desktop | Gera e edita vídeos localmente (Lightricks) | [especiais/video/ltx-desktop](especiais/video/ltx-desktop.md) |
| MetaClaw | Evolui agentes de IA sem GPU | [especiais/video/metaclaw](especiais/video/metaclaw.md) |
| Vane | Motor de respostas de IA com LLMs locais | [especiais/video/vane](especiais/video/vane.md) |

---

## Onde Encontrar Mais Skills

| Recurso | URL | O que tem |
|---------|-----|-----------|
| skillsmp.com | https://skillsmp.com | 80k+ skills, maior catálogo |
| aitmpl.com/skills | https://aitmpl.com/skills | Modelos, instalação com 1 comando |
| skillhub.club | https://skillhub.club | 31k+ skills, ranqueadas por IA |
| agentskills.io | https://agentskills.io | Especificação oficial |
| anthropics/skills | https://github.com/anthropics/skills | Implementações oficiais |
| awesome-claude-skills | https://github.com/travisvn/awesome-claude-skills | Lista curada, 22k ⭐ |
