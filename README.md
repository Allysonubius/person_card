# Allyson OS — person_card

Cartão de apresentação de **Allyson de Oliveira Brandão**, Engenheiro de
Software Sênior Full Stack, construído como um ambiente de desktop no
navegador: tela de bloqueio, barra superior, Dock com magnificação, janelas
redimensionáveis e painel lateral de notícias.

O conteúdo do app "Sobre mim" reflete o currículo profissional: experiência,
stack por área, formação, competências, certificações, reconhecimentos e
idiomas.

🔗 **Demo:** https://allysonubius.github.io/person_card/

## Stack

HTML, CSS e JavaScript puros — sem build, sem dependências, sem framework.
Basta abrir o `index.html` ou publicar a pasta em qualquer host estático.

## Estrutura

| Arquivo       | Responsabilidade                                              |
| ------------- | ------------------------------------------------------------- |
| `index.html`  | Marcação semântica, metadados de SEO e Open Graph              |
| `styles.css`  | Design tokens, superfícies translúcidas, layout e responsivo   |
| `app.js`      | Dados do currículo, janelas, Dock, popovers e feed de notícias |
| `favicon.svg` | Ícone da página                                                |
| `img/`        | Foto de perfil e papel de parede                               |

## Executar localmente

```bash
python -m http.server 5500
```

Depois acesse `http://localhost:5500`.

> O feed de notícias consome a API pública do Hacker News. Servir por HTTP
> evita bloqueios de CORS que ocorrem ao abrir via `file://`.

## Interface

- **Tela de bloqueio** — relógio grande, avatar e campo de senha; `Enter` entra
- **Barra superior** — menu do sistema, nome do app em foco, ajustes rápidos e relógio
- **Dock** — magnificação por proximidade do cursor, tooltips e indicador de app aberto
- **Janelas** — fechar, minimizar e ampliar; título centralizado, arraste com
  limite, duplo clique amplia e redimensionamento livre
- **Painel de notícias** — feed do Hacker News com carregamento sob demanda,
  busca paralela, cache de sessão (10 min) e paginação
- **Responsivo** — no celular as janelas abrem em tela cheia e o Dock encolhe
- **Acessibilidade** — navegação por teclado, `aria-label`, `aria-expanded`,
  `Esc` fecha popovers, suporte a `prefers-reduced-motion`

## Atualizar o conteúdo

Todo o currículo está em constantes no topo de `app.js` — `JOBS`, `STACK`,
`EDUCATION`, `COMPETENCIES`, `CERTIFICATIONS`, `AWARDS` e `LANGUAGES`. Editar
esses arrays basta; a renderização é automática.
