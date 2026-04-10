# FlashcardsNEW

Aplicacao web para:
- Upload de PDF
- Geracao automatica de flashcards
- Estudo com repeticao espacada (SRS)
- Sistema de conhecimento adaptativo (errou = revisa mais, acertou = revisa menos)
- Notas no verso do flashcard e tags por assunto
- Busca, filtros e treino rapido no estudo
- Login/cadastro com confirmacao por e-mail
- Checkout de planos (em pausa temporaria)

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres)
- Gemini (geracao de flashcards com IA)
- Stripe (assinaturas)
- pdf-parse (extracao de texto de PDF)

## Fluxo principal

1. Usuario cria conta em /auth
2. Supabase envia confirmacao por e-mail
3. Usuario faz login
4. Usuario envia PDF em /upload
5. API extrai texto e gera flashcards
6. Usuario estuda em /study com logica SRS
7. Usuario acompanha o historico e as metricas em /progress
8. Checkout sera ativado apos validacao do fluxo principal

## Estrutura

- app/page.tsx: landing page com planos
- app/auth/page.tsx: login, cadastro e recuperacao
- app/dashboard/page.tsx: area logada
- app/progress/page.tsx: historico, graficos e indicadores por PDF/tag
- app/upload/page.tsx: upload de PDF
- app/study/page.tsx: revisao, busca, filtros, notas e tags
- app/checkout/page.tsx: pagina de aviso (checkout em pausa)
- app/api/upload/route.ts: processamento de PDF
- app/api/flashcards/generate/route.ts: retorno de flashcards
- app/api/stripe/checkout/route.ts: criacao de sessao Stripe
- app/api/stripe/webhook/route.ts: webhook para confirmar assinatura
- supabase/schema.sql: schema base e RLS

## Como rodar (Windows + PowerShell)

1. Instale dependencias:

```powershell
npm install
```

2. Crie o arquivo .env.local com base no .env.example.

3. Configure Supabase:
- Crie um projeto no Supabase
- Execute o SQL de supabase/schema.sql no SQL Editor
- Copie URL e ANON KEY para .env.local

4. Configure Gemini:
- Crie uma API key no Google AI Studio
- Preencha GEMINI_API_KEY no .env.local
- Opcional: ajuste GEMINI_MODEL (padrao: gemini-1.5-flash)

5. (Opcional por enquanto) Configure Stripe:
- Crie produtos Basico e Premium
- Copie os price IDs para STRIPE_PRICE_BASIC e STRIPE_PRICE_PREMIUM
- Copie STRIPE_SECRET_KEY
- Para webhook local, use Stripe CLI:

```powershell
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

6. Rode o projeto:

```powershell
npm run dev
```

7. Acesse:
- http://localhost:3000

## Observacoes importantes

- Nesta versao inicial, os flashcards ficam em memoria (arquivo lib/demo-store.ts) para facilitar o bootstrap.
- A geracao usa Gemini quando GEMINI_API_KEY estiver configurada; se nao estiver, o sistema cai automaticamente para geracao padrao sem IA.
- Quando o Supabase estiver configurado e o usuario estiver autenticado, o upload passa a salvar documentos e flashcards no banco, e a tela de estudo passa a ler do banco.
- O estudo usa fila adaptativa e registra historico de revisao: cards errados entram como "dificeis" e voltam mais cedo; cards acertados varias vezes passam a aparecer menos.
- O historico de revisao agora registra tambem o tempo de resposta por flashcard.
- O Gemini agora trabalha em blocos menores do PDF e gera perguntas, respostas, notas e tags.
- A tela de estudo permite busca, filtros por PDF/tag/status, modo rapido so dificeis e edicao de notas/tags.
- A pagina de progresso mostra grafico simples por dia e indicadores por PDF e tema.
- Para producao, substitua o armazenamento em memoria por escrita/leitura nas tabelas do Supabase (flashcards/documents).
- O checkout esta pausado temporariamente para priorizar o fluxo principal (upload -> geracao -> estudo).
- A paleta principal da UI segue roxo e branco, com layout responsivo.
- A recuperacao de senha ja esta ligada ao Supabase via e-mail.

## Metodos de pagamento

- Stripe suporta cartao e metodos locais dependendo da configuracao da conta/regiao.
- Se quiser boleto e PayPal simultaneamente, voce pode:
	- Manter Stripe para cartao/boleto (quando habilitado), e
	- Integrar PayPal em paralelo na rota de checkout.

## Proximos passos recomendados

1. Persistir flashcards no Supabase por usuario.
2. Adicionar worker/queue para PDFs longos.
3. Melhorar geracao com LLM (perguntas e respostas de maior qualidade).
4. Criar pagina de historico/progresso com metricas de revisao.
5. Implementar controle de limites do plano Basico no backend.