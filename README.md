# Favela Hacker

![Favela Hacker](https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg)

Favela Hacker é uma iniciativa que visa democratizar o conhecimento em cibersegurança, criando oportunidades reais para jovens talentosos de comunidades.

## 🚀 Recursos

- ✅ Design moderno com tema terminal
- ✅ Modo claro/escuro
- ✅ Blog integrado com MDX
- ✅ Formulário de contato com rate limiting
- ✅ SEO otimizado
- ✅ Feed RSS
- ✅ Sitemap automático
- ✅ Totalmente responsivo

## 🛠️ Stack Tecnológico

- [Astro](https://astro.build)
- [Tailwind CSS](https://tailwindcss.com)
- [MDX](https://mdxjs.com)
- [TypeScript](https://www.typescriptlang.org)

## 📦 Estrutura do Projeto

```
├── public/              # Arquivos estáticos
├── src/
│   ├── components/      # Componentes Astro
│   ├── content/         # Conteúdo do blog (MDX)
│   ├── layouts/         # Layouts reutilizáveis
│   ├── lib/            # Utilitários e funções
│   ├── pages/          # Páginas da aplicação
│   └── styles/         # Estilos globais
├── astro.config.mjs    # Configuração do Astro
└── tailwind.config.mjs # Configuração do Tailwind
```

## 🧞 Comandos

| Comando                   | Ação                                                     |
| :----------------------- | :------------------------------------------------------- |
| `npm install`            | Instala as dependências                                  |
| `npm run dev`            | Inicia o servidor de desenvolvimento em `localhost:4321` |
| `npm run build`          | Gera a versão de produção em `./dist/`                  |
| `npm run preview`        | Visualiza a versão de produção localmente               |

## 🎨 Personalização

### Temas

O projeto suporta tema claro e escuro, com uma estética inspirada em terminal. As cores podem ser personalizadas em:

- `src/styles/global.css`: Variáveis CSS para cores
- `tailwind.config.mjs`: Configuração de cores do Tailwind

### Blog

Os posts do blog são escritos em MDX e armazenados em `src/content/blog/`. Cada post deve incluir:

```yaml
---
title: 'Título do Post'
description: 'Descrição do post'
pubDate: '2024-03-16'
heroImage: 'URL da imagem de capa'
---
```

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👥 Contribuição

Contribuições são bem-vindas! Por favor, leia nossas [diretrizes de contribuição](CONTRIBUTING.md) antes de submeter um PR.

## 📧 Contato

- Email: contato@favelahacker.org
- Twitter: [@favelahacker](https://twitter.com/favelahacker)
- LinkedIn: [Favela Hacker](https://linkedin.com/company/favelahacker)