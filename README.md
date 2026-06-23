# **CSI606-2026-01 - Remoto - Proposta de Trabalho Final**

## **Discente:** Luis Gustavo

### Resumo

O trabalho final consiste no desenvolvimento do FlashcardsNEW, uma aplicacao web para estudo assistido por inteligencia artificial. A plataforma permite enviar arquivos PDF, extrair o conteudo textual, gerar flashcards automaticamente e organizar revisoes com base em repeticao espacada. O sistema tambem registra historico de estudo, permite busca e filtragem de cards, oferece notas e tags por assunto e utiliza autenticacao com confirmacao por e-mail.

### 1. Tema

O trabalho final tem como tema o desenvolvimento de uma aplicacao web para geracao e revisao inteligente de flashcards a partir de documentos PDF, com foco em estudo personalizado e acompanhamento de progresso.

### 2. Escopo

Este projeto tera as seguintes funcionalidades:

- Cadastro, login e recuperacao de senha com autenticacao via Supabase.
- Confirmacao de conta por e-mail.
- Upload de arquivos PDF para processamento automatico.
- Extracao de texto dos documentos enviados.
- Geracao automatica de flashcards com apoio de IA.
- Estudo dos cards com repeticao espacada e fila adaptativa.
- Registro de respostas corretas, incorretas e tempo de revisao.
- Organizacao dos flashcards por notas, tags e documentos de origem.
- Busca, filtros e modo rapido de revisao de cards dificeis.
- Tela de progresso com indicadores e historico de revisao.

### 3. Restrições

Neste trabalho nao serao considerados, nesta etapa inicial:

- Processamento completo de planos pagos e assinatura ativa em producao.
- Suporte avancado a multiplos provedores de pagamento ao mesmo tempo.
- Edicao colaborativa de decks entre varios usuarios.
- Aplicativo mobile nativo.
- Analise semantica avancada de imagens ou OCR para PDFs escaneados.
- Garantia de persistencia total local, pois parte do fluxo ainda pode usar armazenamento temporario durante o desenvolvimento.

### 4. Protótipo

Protótipos e telas iniciais foram estruturados na propria aplicacao web do projeto, incluindo as paginas de autenticacao, upload, estudo e progresso. O repositório com a implementacao e a organizacao das telas pode ser consultado em:

https://github.com/Lu15Gustavo/FlashcardsNEW

### 5. Referências

- Next.js. Documentacao oficial. Disponivel em: https://nextjs.org/docs. Acesso em: 23 jun. 2026.
- Supabase. Documentacao oficial. Disponivel em: https://supabase.com/docs. Acesso em: 23 jun. 2026.
- Google Gemini. Documentacao oficial da API Gemini. Disponivel em: https://ai.google.dev/gemini-api/docs. Acesso em: 23 jun. 2026.
- F. B. Oliveira. CSI477-Sistemas-Web. Modelo de proposta de trabalho final. Disponivel em: https://github.com/fboliveira/CSI477-Sistemas-Web/blob/master/Templates/Project/01-proposal.md. Acesso em: 23 jun. 2026.