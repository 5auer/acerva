# Guia de Instalação Rápida

> Me diga qual ferramenta você quer instalar e eu faço tudo.
> Use o nome exato da tabela abaixo ou a categoria.

---

## Como instalar Skills do Claude

```bash
# Instalação global (disponível em todos os projetos)
destino=~/.claude/skills

# Instalação por projeto (apenas no projeto atual)
destino=.claude/skills
```

### Todas as Skills Oficiais (Anthropic) de uma vez
```bash
mkdir -p ~/.claude/skills
cd /tmp
git clone https://github.com/anthropics/skills.git --depth=1
cp -r skills/skills/* ~/.claude/skills/
rm -rf /tmp/skills
echo "Skills instaladas em ~/.claude/skills"
ls ~/.claude/skills
```

### Skills individuais (substitua NOME_DA_SKILL)
```bash
SKILL="pdf"   # <- mude aqui: pdf, docx, pptx, xlsx, doc-coauthoring,
              #    frontend-design, canvas-design, algorithmic-art,
              #    theme-factory, web-artifacts-builder, skill-creator,
              #    brand-guidelines

mkdir -p ~/.claude/skills
cd /tmp
git clone https://github.com/anthropics/skills.git --depth=1 --no-checkout anthropic-skills
cd anthropic-skills
git sparse-checkout set skills/$SKILL
git checkout
cp -r skills/$SKILL ~/.claude/skills/$SKILL
cd /tmp && rm -rf anthropic-skills
echo "Skill '$SKILL' instalada!"
```

---

## Como instalar MCPs

### Tavily (busca web)
```bash
# 1. Crie conta e pegue API key em https://tavily.com
# 2. Adicione ao Claude Code:
claude mcp add tavily -- npx -y @tavily/mcp
# 3. Configure a API key no ambiente:
export TAVILY_API_KEY="sua-key-aqui"
```

### Context7 (docs de bibliotecas)
```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp
# Uso: adicione "use context7" em qualquer prompt
```

### Task Master AI (gerenciamento de projeto)
```bash
npm install -g task-master-ai
claude mcp add task-master -- task-master-ai
```

### Playwright MCP (automação de navegador)
```bash
npx playwright install chromium
claude mcp add playwright -- npx @executeautomation/playwright-mcp-server
```

### Markdownify MCP (PDFs/imagens → Markdown)
```bash
claude mcp add markdownify -- npx @zcaceres/markdownify-mcp
```

---

## Como instalar Frameworks Python

```bash
# LangGraph
pip install langgraph langchain-anthropic

# CrewAI
pip install crewai crewai-tools

# pydantic-ai (type-safe agents)
pip install pydantic-ai anthropic

# DSPy (programar modelos)
pip install dspy-ai

# Firecrawl (web scraping)
pip install firecrawl-py

# GPT Researcher
pip install gpt-researcher

# Vanna AI (SQL)
pip install vanna
```

---

## Como instalar Ferramentas Locais

```bash
# Ollama (LLMs locais)
winget install Ollama.Ollama   # Windows
# curl -fsSL https://ollama.com/install.sh | sh  # Linux/Mac

# n8n (automação)
docker run -p 5678:5678 -v ~/.n8n:/home/node/.n8n docker.n8n.io/n8nio/n8n

# Open WebUI (interface ChatGPT local)
docker run -d -p 3000:8080 --add-host=host.docker.internal:host-gateway \
  -v open-webui:/app/backend/data --name open-webui \
  ghcr.io/open-webui/open-webui:main
```

---

## Verificar instalações

```bash
# Skills instaladas
ls ~/.claude/skills/

# MCPs configurados no Claude Code
claude mcp list

# Ollama funcionando
ollama list

# n8n rodando
curl http://localhost:5678
```

---

## Variáveis de ambiente necessárias

```bash
# Anthropic (obrigatório para Claude API)
export ANTHROPIC_API_KEY="sk-ant-..."

# Tavily (busca web)
export TAVILY_API_KEY="tvly-..."

# Firecrawl (web scraping)
export FIRECRAWL_API_KEY="fc-..."

# Para Windows (PowerShell)
$env:ANTHROPIC_API_KEY="sk-ant-..."
```

Adicione ao seu `~/.bashrc` ou `~/.zshrc` para persistir.
