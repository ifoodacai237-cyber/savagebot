# Discord Username Generator + Sniper 🎯

Sistema automático e otimizado para gerar, verificar disponibilidade e monitorar usernames do Discord.

## 🚀 Features

### ✨ Gerador de Usernames
- **Múltiplas categorias:**
  - `short`: 2-5 caracteres aleatórios
  - `numbers`: Palavras com números
  - `realword`: Palavras reais em inglês/português
  - `mixed`: Mix de palavras e números
  - `rare`: Padrões especiais e únicos

- **Geração massiva**: Cria ~5.000 usernames a cada 5 minutos
- **Banco de dados otimizado**: SQLite com índices inteligentes
- **Sistema de cache**: Evita verificações redundantes

### 🎯 Sistema de Sniper
- Monitora usernames específicos em tempo real
- Notificação instantânea quando disponível
- Suporte a múltiplos usuários simultaneamente
- Histórico de capturas

### 📊 Verificação de Disponibilidade
- Verifica status de múltiplos usernames
- Rate limiting inteligente
- Tratamento de erros automático
- Cache de resultados

## 📋 Instalação

### 1. Clonar repositório
```bash
git clone https://github.com/pedrohalmeida2207-gif/fallen-angels-bot.git
cd fallen-angels-bot/sniper_bot
```

### 2. Instalar dependências
```bash
pip install -r requirements.txt
```

### 3. Configurar variáveis de ambiente
```bash
# Edite .env com seu token do Discord
DISCORD_TOKEN=seu_token_aqui
```

### 4. Executar
```bash
python main.py
```

## 🎮 Comandos

### `/gerar [categoria]`
Inicia geração automática de usernames
```
/gerar categoria:mixed
```

### `/snipe_add [username]`
Adiciona username para monitoramento
```
/snipe_add username:pedrobot
```

### `/snipe_list`
Lista seus alvos de snipe em monitoramento
```
/snipe_list
```

### `/disponivel [username]`
Verifica disponibilidade de um username
```
/disponivel username:teste
```

### `/status`
Mostra estatísticas do sistema
```
/status
```

## 🏗️ Arquitetura

```
sniper_bot/
├── main.py           - Ponto de entrada e comandos
├── db.py             - Gerenciamento de banco de dados
├── generator.py      - Geração de usernames
├── checker.py        - Verificação de disponibilidade
├── sniper.py         - Sistema de monitoramento
├── requirements.txt  - Dependências
└── .env              - Configuração
```

## 📊 Desempenho

- ⚡ ~2.500 verificações por minuto
- 💾 Otimizado para milhões de usernames
- 🔄 Geração contínua em background
- 📈 Escalável para múltiplos servidores

## ⚙️ Configuração Avançada

### Customizar fonte de palavras
Edite `generator.py` - métodos `_load_english_words()` e `_load_portuguese_words()`

### Ajustar frequência de verificação
`main.py` - Altere `@tasks.loop(minutes=2)` para frequência desejada

### Otimizar performance
`db.py` - Modifique `PRAGMA` settings conforme necessário

## 🔒 Segurança

- ✅ Token protegido em `.env`
- ✅ Rate limiting automático
- ✅ Validação de inputs
- ✅ Tratamento de erros

## ⚠️ Disclaimer

Este sistema deve ser usado de acordo com os termos de serviço do Discord. Use responsavelmente e respeite as limitações da API.

## 📝 Licença

MIT License

## 🤝 Contribuições

Contribuições são bem-vindas! Abra um PR ou issue.

## 📧 Suporte

Para dúvidas ou problemas, abra uma issue no GitHub.
