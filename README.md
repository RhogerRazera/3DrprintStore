# Kriatto3D

Loja e catálogo de produtos personalizados da Kriatto3D. O site usa Next.js com exportação estática, Firebase Authentication, Cloud Firestore e Firebase Hosting, para permanecer compatível com a hospedagem Firebase Spark.

## Produção

- Site: <https://portfolio-3drprint-2026.web.app>
- Painel: <https://portfolio-3drprint-2026.web.app/admin/>
- Projeto Firebase: `portfolio-3drprint-2026`
- Conta administradora: `3drprintstore@gmail.com` (Google, e-mail verificado)

## Painel

O painel permite editar o conteúdo da página inicial, categorias, produtos, kits promocionais e cores/variações. Também lista solicitações antigas e pedidos iniciados pelo carrinho. Os produtos, variações e kits ficam na coleção `products`; cores globais em `productColors`; conteúdo da landing page em `siteContent/home`; pedidos em `orders`.

Produtos podem ser feitos sob encomenda (estoque vazio) ou ter estoque geral/por variação. O estoque de um kit é calculado a partir dos componentes. O checkout revalida preço e disponibilidade e abre uma conversa no WhatsApp. Ele cria um pedido pendente; **não reserva estoque**. O administrador confirma o pedido no painel para baixar o estoque uma vez, ou cancela para restaurar uma baixa anterior.

Os pedidos públicos são limitados a 10 linhas, 99 unidades por linha, campos permitidos e produtos publicados. As regras validam cada referência de produto. Para ativar Firebase App Check no app Web:

1. Registre o domínio em reCAPTCHA v3 e configure o provedor reCAPTCHA v3 no Firebase Console → App Check.
2. Adicione a chave de site em `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY` no `.env.local` e no ambiente usado para o build.
3. Publique o app e acompanhe as métricas de solicitações verificadas antes de ativar enforcement para o Firestore no Console.

Sem a chave de site, o app mantém App Check desativado; as regras de validação de pedido continuam ativas.

## Firebase local

Copie `.env.example` para `.env.local` e preencha os valores da configuração do app Web em Firebase Console → Configurações do projeto → Seus apps. Esses valores do app Web são públicos; **não** coloque chaves de conta de serviço ou credenciais privadas no navegador.

O arquivo `.firebaserc` seleciona `portfolio-3drprint-2026`. As regras e índices estão em `firestore.rules` e `firestore.indexes.json`.

## Desenvolvimento e validação

```bash
npm install
npm run dev
npm run lint
npx tsc --noEmit --incremental false
npm test
npm run build
```

Para publicar o site e as regras/índices:

```bash
npm run build
firebase deploy --only hosting,firestore:rules,firestore:indexes --project portfolio-3drprint-2026
```

