# 🤖 CLAUDE - Sistema PDF Compressor

> **Arquivo de Contexto para Claude**: Este documento contém todas as informações necessárias para dar manutenção e adicionar funcionalidades ao sistema PDF Compressor.

## 📋 **Visão Geral do Sistema**

**Objetivo:** Interface web para compressão em lote de arquivos PDF usando a API Stirling PDF.

**Tecnologias:**
- **Backend:** Node.js + Express (servidor proxy)
- **Frontend:** HTML + CSS + JavaScript (vanilla)
- **API Externa:** Stirling PDF (http://localhost:8080)
- **Controle:** Script Bash para gerenciamento

## 🏗️ **Arquitetura do Sistema**

### **Estrutura de Pastas:**
```
pasta-de-trabalho/
├── api-pdf/                    # Pasta principal do código
│   ├── server.js              # Servidor Node.js (proxy CORS)
│   ├── index.html             # Interface web principal
│   ├── package.json           # Dependências Node.js
│   ├── README.md              # Documentação do usuário
│   ├── CLAUDE.md              # Este arquivo (contexto para Claude)
│   ├── server.log             # Logs do servidor
│   └── node_modules/          # Dependências instaladas
├── control.sh                 # Script de controle (FORA da pasta api-pdf)
└── [pastas-comprimidas]/      # Arquivos comprimidos salvos aqui
```

### **Fluxo de Funcionamento:**
1. **Usuário** acessa interface web (http://localhost:3000)
2. **Interface** seleciona pasta com PDFs + pasta de destino
3. **JavaScript** envia arquivos para servidor proxy Node.js
4. **Servidor proxy** repassa para API Stirling PDF (http://localhost:8080)
5. **API Stirling** comprime o PDF e retorna
6. **Servidor proxy** salva arquivo comprimido na pasta selecionada
7. **Interface** mostra progresso e abre pasta final

## 🔧 **Componentes Detalhados**

### **1. server.js (Servidor Node.js)**

**Função:** Proxy CORS entre navegador e API Stirling PDF
- **Porta:** 3000
- **Endpoints:**
  - `GET /` - Serve interface web
  - `POST /api/compress-pdf` - Compressão de PDF
  - `POST /api/open-folder` - Abre pasta no explorador
  - `GET /health` - Status do servidor

**Lógica de Salvamento:**
- Recebe `destinationPath` (relativo) e `originalFilePath`
- Se caminho absoluto: usa direto
- Se relativo: resolve a partir do diretório de trabalho (onde está control.sh)
- Cria diretórios recursivamente se não existem
- Salva como `arquivo_red.pdf`

**Dependências:**
- express, cors, multer, node-fetch, form-data

### **2. index.html (Interface Web)**

**Seções:**
- **Seleção de pasta fonte** (PDFs originais)
- **Seleção de pasta destino** (obrigatório)
- **Nível de otimização** (1-5)
- **Barra de progresso** em tempo real
- **Lista de arquivos** com status individual
- **Estatísticas finais** (economia, tempo, etc.)

**JavaScript Classes:**
- `PDFCompressor` - Classe principal
  - `sourceFiles[]` - Arquivos PDF selecionados
  - `destinationPath` - Pasta de destino (relativa)
  - `compressFile()` - Processa um arquivo
  - `startCompression()` - Inicia processo em lote

**Limitação Importante:**
- Navegador não fornece caminhos absolutos (segurança)
- Usa `webkitRelativePath` que retorna caminhos relativos
- Servidor resolve caminhos relativos a partir do working directory

### **3. control.sh (Script de Controle)**

**Localização:** FORA da pasta api-pdf (diretório pai)

**Comandos:**
- `./control.sh start` - Inicia servidor
- `./control.sh stop` - Para servidor
- `./control.sh restart` - Reinicia servidor
- `./control.sh status` - Verifica status

**Funcionalidade:**
- Define diretório base como onde o script está localizado
- Executa servidor a partir desse diretório (working directory)
- Arquivos comprimidos são salvos relativos a este diretório

## 🐛 **Problemas Conhecidos e Soluções**

### **1. Erro de CORS**
**Problema:** API Stirling PDF não aceita requisições diretas do navegador
**Solução:** Servidor Node.js atua como proxy

### **2. Caminhos Absolutos**
**Problema:** Navegador não fornece caminhos absolutos das pastas selecionadas
**Solução:** 
- Usar caminhos relativos
- Executar servidor a partir do diretório desejado
- Script control.sh controla working directory

### **3. Dependências ESM**
**Problema:** node-fetch é ESM, mas projeto usa CommonJS
**Solução:** `const fetch = (await import('node-fetch')).default;`

## 🚀 **Como Adicionar Funcionalidades**

### **Adicionar Novo Endpoint:**

1. **server.js:**
```javascript
app.post('/api/nova-funcionalidade', (req, res) => {
    try {
        // Lógica aqui
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

2. **index.html:**
```javascript
async function novaFuncionalidade() {
    const response = await fetch('/api/nova-funcionalidade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    });
    return await response.json();
}
```

### **Adicionar Nova Interface:**

1. Seguir padrão de elementos:
```javascript
this.elements = {
    novoElemento: document.getElementById('novoElemento'),
    // ...
};
```

2. Adicionar event listeners:
```javascript
this.elements.novoElemento.addEventListener('change', (e) => this.handleNovoElemento(e));
```

### **Modificar Salvamento:**

Editar `server.js`, função principal do endpoint `/api/compress-pdf`:
- Lógica de `saveDir` para novos padrões de pasta
- Modificar `outputFilename` para novos sufixos
- Adicionar validações específicas

## 📝 **Convenções de Código**

### **Logging:**
- `console.log('✅ Sucesso')` para operações bem-sucedidas
- `console.error('❌ Erro')` para erros
- `console.warn('⚠️ Aviso')` para warnings
- Emojis para facilitar identificação visual nos logs

### **Nomenclatura:**
- **Arquivos:** `arquivo_red.pdf` (sufixo atual)
- **Pastas:** Manter estrutura original selecionada
- **Variáveis:** camelCase no JavaScript, snake_case em logs

### **Error Handling:**
- Sempre usar try/catch
- Retornar JSON com `{ error: 'message' }` para erros
- Logs detalhados no servidor
- Feedback claro na interface

## 🔐 **Segurança**

### **Validações Implementadas:**
- Tipo de arquivo (apenas PDFs)
- Tamanho máximo (100MB por arquivo)
- Validação de caminhos (evitar path traversal)
- Sanitização de nomes de arquivo

### **Limitações de Segurança:**
- Navegador não permite acesso direto ao sistema de arquivos
- Caminhos absolutos não são fornecidos pelo browser
- Dependência de working directory para salvamento

## 📊 **Monitoramento**

### **Logs Importantes:**
- `server.log` - Logs principais do servidor
- Status HTTP de cada requisição
- Tamanhos de arquivo (original vs comprimido)
- Tempo de processamento
- Caminhos de salvamento

### **Métricas de Performance:**
- Taxa de compressão por arquivo
- Tempo total de processamento
- Sucessos vs falhas
- Economia de espaço total

## 🧪 **Testes**

### **Testar Funcionalidade:**
1. Iniciar Stirling PDF (porta 8080)
2. Executar `./control.sh start`
3. Acessar http://localhost:3000
4. Selecionar pasta com PDFs
5. Selecionar pasta de destino
6. Processar e verificar arquivos salvos

### **Testar API Diretamente:**
```bash
curl -X POST "http://localhost:3000/api/compress-pdf" \
  -F "fileInput=@arquivo.pdf" \
  -F "optimizeLevel=3" \
  -F "destinationPath=teste"
```

## 🔄 **Manutenção Regular**

### **Checklist:**
- [ ] Verificar dependências atualizadas (`npm audit`)
- [ ] Testar com diferentes tipos de PDF
- [ ] Verificar logs de erro
- [ ] Validar funcionamento do Stirling PDF
- [ ] Testar em diferentes sistemas operacionais

### **Backup:**
- Código fonte está em `/Users/melque/Projetos/api-pdf/`
- Configurações no `package.json`
- Script de controle em `/Users/melque/Projetos/control.sh`

## 📚 **Referências**

- **Stirling PDF API:** http://localhost:8080/v1/api-docs
- **Express.js:** https://expressjs.com/
- **Multer:** https://github.com/expressjs/multer
- **Node-fetch:** https://github.com/node-fetch/node-fetch

---

**Última atualização:** 29/06/2025  
**Versão:** 1.0  
**Autor:** Claude & Usuário  

> 💡 **Dica para Claude:** Sempre consulte este arquivo antes de fazer modificações no sistema. Ele contém o contexto completo e decisões arquiteturais importantes.