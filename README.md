# 🗜️ PDF Compressor Web Interface

Interface web moderna para compressão em lote de arquivos PDF usando a API Stirling PDF.

## ✨ Recursos

- **Compressão em Lote**: Processe múltiplos PDFs simultaneamente
- **Interface Intuitiva**: Design moderno e responsivo
- **Barra de Progresso**: Acompanhe o progresso em tempo real
- **Configurável**: 5 níveis de compressão disponíveis
- **Estatísticas Detalhadas**: Veja economia de espaço e tempo de processamento
- **Download Automático**: Arquivos comprimidos são baixados automaticamente

## 🚀 Como Usar

### Pré-requisitos

1. **Node.js** instalado (versão 14 ou superior)
2. **Stirling PDF** rodando em `http://localhost:8080`

### Instalação e Execução

1. **Clone ou navegue até o diretório:**
   ```bash
   cd /Users/melque/Projetos/api-pdf
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor:**
   ```bash
   npm start
   # ou execute o script:
   ./start.sh
   ```

4. **Abra o navegador em:**
   ```
   http://localhost:3000
   ```

### Usando a Interface

1. **Selecione a pasta** com os arquivos PDF de origem
2. **Selecione a pasta de destino** (obrigatório) onde os arquivos comprimidos serão salvos
3. **Configure o nível de otimização** (1-5)
4. **Clique em "Iniciar Compressão"**
5. **Acompanhe o progresso** - arquivos salvos como `arquivo_red.pdf`
6. **Ao final, a pasta de destino será aberta automaticamente**

### 📁 Estrutura de Pastas

```
pasta-de-trabalho/
├── api-pdf/           # Código do servidor
│   ├── server.js
│   ├── index.html
│   └── package.json
├── control.sh         # Script de controle (FORA da pasta api-pdf)
└── [pastas-criadas]/  # Arquivos comprimidos salvos aqui
```

### 🚀 Inicialização

**Use sempre o script de controle:**

```bash
# Inicia o servidor
./control.sh start

# Para o servidor  
./control.sh stop

# Verifica status
./control.sh status
```

### 💾 Salvamento de Arquivos

Os arquivos comprimidos serão salvos **no mesmo diretório onde está o `control.sh`**, mantendo a estrutura de pastas selecionada na interface.

## 🛠️ Estrutura do Projeto

```
api-pdf/
├── package.json          # Dependências do Node.js
├── server.js             # Servidor proxy CORS
├── index.html            # Interface web
├── start.sh              # Script de inicialização
└── README.md             # Este arquivo
```

## 🔧 Configuração

### Servidor Proxy

O servidor Node.js atua como proxy para resolver problemas de CORS:

- **Porta**: 3000
- **API Endpoint**: `/api/compress-pdf`
- **Health Check**: `/health`
- **Test Stirling**: `/api/test-stirling`

### Endpoints Disponíveis

- `GET /` - Interface web principal
- `POST /api/compress-pdf` - Endpoint de compressão
- `POST /api/open-folder` - Abre pasta no explorador de arquivos
- `GET /health` - Status do servidor
- `GET /api/test-stirling` - Testa conexão com Stirling PDF

## 📊 Funcionalidades

### Compressão
- **5 níveis** de otimização
- **Processamento sequencial** para evitar sobrecarga
- **Tratamento de erros** robusto
- **Feedback visual** para cada arquivo

### Interface
- **Design responsivo** para desktop e mobile
- **Progress tracking** em tempo real
- **Estatísticas detalhadas** de compressão
- **Lista de arquivos** com status individual
- **Seleção obrigatória** de pasta de destino
- **Abertura automática** da pasta de destino ao final
- **Validação** para prevenir execução sem destino selecionado

### Segurança
- **Upload limitado** a 100MB por arquivo
- **Validação de tipo** (apenas PDFs)
- **Tratamento de erros** adequado

## 🐛 Resolução de Problemas

### Erro de CORS
O servidor proxy resolve automaticamente problemas de CORS entre o navegador e a API Stirling PDF.

### Stirling PDF não acessível
Verifique se o Stirling PDF está rodando em `http://localhost:8080`:
```bash
curl http://localhost:8080/api/v1/info/status
```

### Porta em uso
Se a porta 3000 estiver em uso, edite `server.js` e altere a variável `PORT`.

## 📝 Logs

O servidor exibe logs detalhados no console:
- ✅ Sucessos de compressão
- ❌ Erros e falhas
- 📊 Estatísticas de tamanho
- 🔄 Status de processamento

## 🎯 Próximos Passos

- [ ] Suporte a outros formatos
- [ ] Configuração de qualidade avançada
- [ ] Histórico de compressões
- [ ] API REST própria
- [ ] Docker support

---

**Desenvolvido para compressão eficiente de PDFs usando Stirling PDF** 🚀