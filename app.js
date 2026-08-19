/* ============================================================
   Allyson OS — lógica da aplicação
   ============================================================ */

"use strict";

const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------
   Utilitários
   ------------------------------------------------------------ */

/** Cria um elemento com atributos e filhos, sem usar innerHTML. */
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "style") node.setAttribute("style", value);
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (value !== null && value !== undefined)
      node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child) node.appendChild(child);
  }
  return node;
}

/** Extrai o domínio de uma URL sem lançar exceção em URLs malformadas. */
function hostnameOf(url) {
  if (!url) return "news.ycombinator.com";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "news.ycombinator.com";
  }
}

const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

const openExternal = (url) => window.open(url, "_blank", "noopener,noreferrer");

/* ------------------------------------------------------------
   Relógio
   ------------------------------------------------------------ */

function tickClock() {
  const now = new Date();
  const time = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  $("lockTime").textContent = time;
  $("lockDate").textContent = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  $("menuTime").textContent = time;
  $("menuDate").textContent = now.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

tickClock();
setInterval(tickClock, 1000);

/* ------------------------------------------------------------
   Feed de notícias (Hacker News)
   ------------------------------------------------------------ */

const NEWS_PER_PAGE = 8;
const NEWS_TOTAL = 24;
const NEWS_CACHE_KEY = "allyson-os:news";
const NEWS_CACHE_TTL = 10 * 60 * 1000; // 10 minutos

let newsData = [];
let page = 0;

const FALLBACK_NEWS = [
  {
    title: "Feed indisponível no momento — tente novamente mais tarde",
    url: "",
  },
];

function renderSkeleton() {
  const list = $("newsList");
  list.replaceChildren();
  for (let i = 0; i < NEWS_PER_PAGE; i++) {
    list.appendChild(el("div", { class: "news-skeleton" }));
  }
}

function readNewsCache() {
  try {
    const raw = sessionStorage.getItem(NEWS_CACHE_KEY);
    if (!raw) return null;
    const { at, items } = JSON.parse(raw);
    if (Date.now() - at > NEWS_CACHE_TTL) return null;
    return items;
  } catch {
    return null;
  }
}

function writeNewsCache(items) {
  try {
    sessionStorage.setItem(
      NEWS_CACHE_KEY,
      JSON.stringify({ at: Date.now(), items }),
    );
  } catch {
    /* sessionStorage indisponível — segue sem cache */
  }
}

let newsLoaded = false;

async function loadNews() {
  if (newsLoaded) return;
  newsLoaded = true;
  renderSkeleton();

  const cached = readNewsCache();
  if (cached) {
    newsData = cached;
    renderNews();
    return;
  }

  try {
    const res = await fetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json",
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ids = (await res.json()).slice(0, NEWS_TOTAL);

    // Busca paralela: 24 requisições concorrentes em vez de sequenciais.
    const items = await Promise.all(
      ids.map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    );

    newsData = items.filter((item) => item && item.title);
    if (newsData.length === 0) throw new Error("resposta vazia");
    writeNewsCache(newsData);
  } catch {
    newsData = FALLBACK_NEWS;
    newsLoaded = false; // permite nova tentativa ao reabrir o painel
  }

  renderNews();
}

function renderNews() {
  const list = $("newsList");
  list.replaceChildren();

  const start = page * NEWS_PER_PAGE;
  for (const item of newsData.slice(start, start + NEWS_PER_PAGE)) {
    const url = item.url || `https://news.ycombinator.com/item?id=${item.id}`;

    // textContent evita injeção de HTML vindo do título da API.
    const card = el("a", {
      class: "news-card",
      href: url,
      target: "_blank",
      rel: "noopener noreferrer",
    });
    card.appendChild(el("div", { class: "news-title", text: item.title }));
    card.appendChild(
      el("div", { class: "news-source", text: hostnameOf(item.url) }),
    );
    list.appendChild(card);
  }

  const totalPages = Math.max(1, Math.ceil(newsData.length / NEWS_PER_PAGE));
  $("pageLabel").textContent = `${page + 1} / ${totalPages}`;
  $("prevBtn").disabled = page === 0;
  $("nextBtn").disabled = page >= totalPages - 1;
}

function changePage(delta) {
  const totalPages = Math.ceil(newsData.length / NEWS_PER_PAGE);
  const next = page + delta;
  if (next < 0 || next >= totalPages) return;
  page = next;
  renderNews();
  $("newsList").scrollTo({ top: 0, behavior: "smooth" });
}

/* ------------------------------------------------------------
   Tela de bloqueio
   ------------------------------------------------------------ */

function unlock() {
  const lock = $("lock");
  lock.classList.add("is-unlocking");
  $("desktop").classList.remove("hidden");
  setTimeout(() => {
    lock.classList.add("hidden");
    lock.classList.remove("is-unlocking");
  }, 550);
  if (!isMobile()) openApp("about");
}

function lockScreen() {
  closeAllPopovers();
  $("desktop").classList.add("hidden");
  $("windows").replaceChildren();
  openWindows.clear();
  syncDockIndicators();
  setActiveAppName("Início");
  $("lockPass").value = "";
  $("lock").classList.remove("hidden");
}

/* ------------------------------------------------------------
   Dados do currículo
   ------------------------------------------------------------ */

const LINKEDIN = "https://www.linkedin.com/in/allyson-de-oliveira-6b3596164/";
const GITHUB = "https://github.com/Allysonubius";
const PORTFOLIO =
  "https://jumpy-gasosaurus-23e.notion.site/b370a23b47f148f48c3b7630058b0f99";

const JOBS = [
  {
    company: "MJV Technology & Innovation",
    role: "Engenheiro de Software Sênior",
    client: "Bradesco Seguros · Projeto Bravo",
    period: "mai/2025 — fev/2026",
    duration: "10 meses",
    place: "Curitiba, PR",
    color: "#0a84ff",
    text: "Modernização de aplicações corporativas com a migração de sistemas legados para arquitetura de microsserviços em Java 21 e Spring Boot. Responsável pela análise, desenvolvimento e implementação de soluções escaláveis com foco em desempenho, alta disponibilidade e manutenibilidade. Construção e evolução de APIs REST, integração entre sistemas corporativos e serviços em nuvem AWS, além do desenvolvimento do frontend em Angular 18 e contribuição para pipelines de CI/CD.",
    stack:
      "Java 17 e 21, Spring Boot, Spring Data JPA, Spring Security, Angular 14 e 18, REST APIs, AWS (EC2, ECS, S3, RDS, IAM), Docker, Kubernetes, Apache Kafka, Maven, Git, Jenkins, SonarQube, JUnit 5, Mockito, Oracle Database, OpenAPI/Swagger, Scrum/Kanban.",
  },
  {
    company: "MJV Technology & Innovation",
    role: "Engenheiro de Software Pleno",
    client: "Bradesco Seguros · Projeto Identidade Digital",
    period: "jul/2023 — mai/2025",
    duration: "1 ano e 11 meses",
    place: "Curitiba, PR",
    color: "#0a84ff",
    text: "Desenvolvimento e manutenção de aplicações Full Stack com Java no backend e Angular e React no frontend. Evolução de arquiteturas monolíticas para soluções baseadas em serviços, com migração de integrações SOAP para REST APIs e uso do IBM DataPower como gateway de serviços para gerenciamento e segurança das integrações.",
    stack:
      "Java 8+, Spring Boot, Angular, React, REST APIs, SOAP, IBM DataPower, SQL, Git, Maven, JUnit, Docker, Jenkins, Swagger/OpenAPI, Scrum/Kanban.",
  },
  {
    company: "Compass UOL",
    role: "Engenheiro de Software Pleno",
    client: "Esfera",
    period: "jan/2023 — mai/2023",
    duration: "5 meses",
    place: "São Paulo, SP",
    color: "#30d158",
    text: "Desenvolvimento de soluções em Java com foco em qualidade, performance e segurança. Construção e manutenção de aplicações escaláveis, identificação e correção de falhas, tratamento de vulnerabilidades e implementação de testes unitários em ambiente ágil (Scrum).",
  },
  {
    company: "Indra",
    role: "Engenheiro de Software Pleno · Full Stack",
    client: "Banco do Brasil",
    period: "ago/2022 — dez/2022",
    duration: "5 meses",
    place: "João Pessoa, PB",
    color: "#ff9f0a",
    text: "Projetos estratégicos com foco em ingestão e transferência de dados, integração entre sistemas e confiabilidade operacional. Desenvolvimento e manutenção de serviços backend em Java e Spring Boot com práticas DevOps, TDD, otimização de consultas em SQL Server e MySQL, criação de WebServices, Docker e ambiente Linux.",
  },
  {
    company: "Indra",
    role: "Engenheiro de Software Pleno · Front-End",
    client: "Neoenergia",
    period: "ago/2022 — dez/2022",
    duration: "5 meses",
    place: "João Pessoa, PB",
    color: "#ff9f0a",
    text: "Criação e evolução de interfaces modernas e responsivas com Angular 14 e Materialize, com ênfase em usabilidade. Suporte a sistemas críticos, resolução de incidentes, integração com APIs e automação de processos com Node.js e Shell script.",
  },
  {
    company: "Almaviva Solutions",
    role: "Engenheiro de Software Pleno · Front-End",
    client: "Poupatempo",
    period: "mar/2022 — jul/2022",
    duration: "5 meses",
    place: "São Paulo, SP",
    color: "#bf5af2",
    text: "Modernização de aplicações, substituindo tecnologias legadas (JSF, JSP e Struts) por Angular e React, com ganhos de performance, usabilidade e padronização visual. Integração com APIs REST, correção de bugs e otimizações de performance em ambiente ágil.",
  },
  {
    company: "Venha Pra Nuvem",
    role: "Engenheiro de Software Júnior · Cloud Full Stack",
    client: "B3 e Cerc",
    period: "out/2020 — dez/2021",
    duration: "1 ano e 3 meses",
    place: "Rio de Janeiro, RJ",
    color: "#5e5ce6",
    text: "Desenvolvimento de sistemas baseados em arquitetura de microsserviços, com ênfase em escalabilidade, desempenho e segurança. Atuação em projetos de gestão pública, infraestrutura, faturamento de energia e mercado financeiro, priorizando confiabilidade, integridade de dados e alta disponibilidade, com aplicação de TDD.",
  },
  {
    company: "Centro Espírita Beneficente União do Vegetal",
    role: "Auxiliar de Escritório",
    client: null,
    period: "nov/2017 — jun/2019",
    duration: "1 ano e 8 meses",
    place: "Brasília, DF",
    color: "#8e8e93",
    text: "Rotinas administrativas e operacionais: atendimento, organização de agendas e reuniões, controle financeiro, gestão de documentos, controle de estoque e elaboração de relatórios e orçamentos.",
  },
];

const STACK = [
  {
    group: "Backend",
    items: [
      "Java 8 / 17 / 21",
      "Spring Boot",
      "Spring Data JPA",
      "Spring Security",
      "REST APIs",
      "SOAP",
      "Apache Kafka",
      "Node.js",
    ],
  },
  {
    group: "Frontend",
    items: ["Angular 14 / 18", "React", "JavaScript ES6", "Materialize"],
  },
  {
    group: "Cloud e DevOps",
    items: [
      "AWS (EC2, ECS, S3, RDS, IAM)",
      "Azure",
      "Google Cloud",
      "Docker",
      "Kubernetes",
      "Jenkins",
      "CI/CD",
      "Linux",
      "Shell script",
    ],
  },
  {
    group: "Dados",
    items: ["Oracle Database", "SQL Server", "MySQL", "SQL", "NoSQL"],
  },
  {
    group: "Qualidade e ferramentas",
    items: [
      "JUnit 5",
      "Mockito",
      "TDD",
      "SonarQube",
      "Maven",
      "Git / GitHub / GitLab",
      "OpenAPI / Swagger",
      "IBM DataPower",
      "Scrum / Kanban",
    ],
  },
];

const EDUCATION = [
  {
    title: "Tecnologia em Análise e Desenvolvimento de Sistemas",
    org: "Estácio",
    period: "fev/2020 — nov/2024",
  },
  {
    title: "Certificação Legacy Full Stack — Engenharia de Software",
    org: "freeCodeCamp",
    period: "jan/2020 — abr/2023",
  },
];

const COMPETENCIES = [
  "Arquitetura de microsserviços",
  "Modernização e migração de sistemas legados",
  "Desenvolvimento Full Stack",
  "Análise de vulnerabilidades e correção",
  "Testes automatizados e TDD",
  "Bancos de dados SQL e NoSQL",
  "Cloud (AWS, Azure e Google Cloud)",
  "Versionamento com Git e GitHub",
  "Metodologias ágeis e trabalho por squad",
  "Comunicação com públicos técnicos e de negócio",
];

const CERTIFICATIONS = [
  ["Scrum Fundamentals Certified (SFC)", "VMEdu"],
  ["DevOps Essentials", "4Linux"],
  ["Java Developer", "Digital Innovation One"],
  ["Especialista em Inovação Digital", "Digital Innovation One"],
  ["Angular 9", "Cod3r"],
  ["Jenkins Fundamentals", "CloudBees"],
  ["Fundamentos da LGPD", "Certiprof"],
  ["Microsoft Digital Literacy", "Microsoft"],
];

const AWARDS = [
  "Lifelong Learning 2025",
  "AWS Experience Day",
  "Semana de IA 2024",
];

const LANGUAGES = [
  ["Português", "Língua materna"],
  ["Inglês", "B1 — pré-intermediário"],
  ["Espanhol", "B1 — pré-intermediário"],
];

/* ------------------------------------------------------------
   Conteúdo dos apps
   ------------------------------------------------------------ */

function buildAbout() {
  const toolbar = el("div", { class: "app-toolbar" }, [
    el("span", { text: "🔗" }),
    el("a", {
      href: LINKEDIN,
      target: "_blank",
      rel: "noopener noreferrer",
      text: "linkedin.com/in/allyson-de-oliveira",
    }),
    el("span", { text: "·" }),
    el("a", {
      href: GITHUB,
      target: "_blank",
      rel: "noopener noreferrer",
      text: "github.com/Allysonubius",
    }),
  ]);

  const body = el("div", { class: "app-body" });

  body.append(
    el("div", { class: "profile" }, [
      el("img", {
        src: "./img/62918698.jpg",
        alt: "Foto de perfil de Allyson de Oliveira",
        loading: "lazy",
      }),
      el("div", {}, [
        el("h1", { text: "Allyson de Oliveira Brandão" }),
        el("p", {
          class: "role",
          text: "Engenheiro de Software Sênior · Full Stack",
        }),
        el("p", {
          class: "stack",
          text: "João Pessoa, PB · Java • Spring Boot • Angular • React • AWS • Microsserviços",
        }),
      ]),
    ]),
    el("hr", { class: "divider" }),
  );

  body.append(
    el("h2", { text: "Objetivo" }),
    el("p", {
      text: "Engenheiro de Software com expertise em arquitetura de microsserviços, modernização de sistemas legados e desenvolvimento Full Stack. Comprometido com qualidade de código, escalabilidade e alinhamento estratégico entre tecnologia e necessidades de negócio.",
    }),
    el("p", {
      text: "Atuo desde 2020 em ambientes corporativos de alta criticidade — mercado financeiro, seguros, energia e gestão pública — participando de projetos de transformação digital, migração de legados e construção de soluções cloud-native.",
    }),
  );

  body.append(el("h2", { text: "Experiência profissional" }));
  const timeline = el("div", { class: "timeline" });
  for (const job of JOBS) {
    const card = el("div", {
      class: "job",
      style: `--job-color:${job.color}`,
    });

    card.append(
      el("h3", { text: job.company }),
      el("p", { class: "job-role", text: job.role }),
    );

    if (job.client) {
      card.appendChild(el("p", { class: "job-client", text: job.client }));
    }

    card.appendChild(
      el("div", { class: "job-meta" }, [
        el("span", { text: job.period }),
        el("span", { class: "badge", text: job.duration }),
        el("span", { text: job.place }),
      ]),
    );

    card.appendChild(el("p", { text: job.text }));

    if (job.stack) {
      card.appendChild(
        el("p", {
          style: "font-size:0.78rem;color:var(--text-faint);margin-top:8px",
          text: `Stack: ${job.stack}`,
        }),
      );
    }

    timeline.appendChild(card);
  }
  body.appendChild(timeline);

  body.append(el("h2", { text: "Stack tecnológica" }));
  for (const { group, items } of STACK) {
    const chips = el("div", { class: "chips" });
    for (const item of items) {
      chips.appendChild(el("span", { class: "chip", text: item }));
    }
    body.appendChild(
      el("div", { class: "stack-group" }, [el("h3", { text: group }), chips]),
    );
  }

  body.append(el("h2", { text: "Formação acadêmica" }));
  const edu = el("div", { class: "card-list" });
  for (const item of EDUCATION) {
    edu.appendChild(
      el("div", { class: "card" }, [
        el("strong", { text: item.title }),
        el("small", { text: `${item.org} · ${item.period}` }),
      ]),
    );
  }
  body.appendChild(edu);

  body.append(el("h2", { text: "Competências" }));
  const comps = el("ul", { class: "two-col" });
  for (const item of COMPETENCIES) {
    comps.appendChild(el("li", { text: item }));
  }
  body.appendChild(comps);

  body.append(el("h2", { text: "Certificações" }));
  const certs = el("ul", { class: "two-col" });
  for (const [name, org] of CERTIFICATIONS) {
    certs.appendChild(el("li", { text: `${name} — ${org}` }));
  }
  body.appendChild(certs);
  body.appendChild(
    el("p", {
      style: "font-size:0.78rem;color:var(--text-faint);margin-top:10px",
      text: "Mais de 200 cursos complementares concluídos em plataformas como Udemy, Digital Innovation One, Loiane Training e Fundação Bradesco.",
    }),
  );

  body.append(el("h2", { text: "Reconhecimentos" }));
  const awards = el("ul", {});
  for (const item of AWARDS) {
    awards.appendChild(el("li", { text: item }));
  }
  body.appendChild(awards);

  body.append(el("h2", { text: "Idiomas" }));
  const langs = el("div", {});
  for (const [name, level] of LANGUAGES) {
    langs.appendChild(
      el("div", { class: "lang-row" }, [
        el("span", { text: name }),
        el("span", { style: "color:var(--text-faint)", text: level }),
      ]),
    );
  }
  body.appendChild(langs);

  return [toolbar, body];
}

function buildPortfolio() {
  const toolbar = el("div", { class: "app-toolbar" }, [
    el("span", { text: "🌐" }),
    el("span", { text: "notion.site/portfolio" }),
  ]);

  const center = el("div", { class: "app-center" }, [
    el("div", { style: "font-size:3.2rem", text: "🗂️" }),
    el("h2", { style: "margin:0;font-size:1.1rem", text: "Portfólio completo" }),
    el("p", {
      style: "color:var(--text-dim);max-width:340px;margin:0",
      text: "Projetos, estudos de caso e detalhes técnicos hospedados no Notion.",
    }),
    el("a", {
      class: "btn-pill",
      href: PORTFOLIO,
      target: "_blank",
      rel: "noopener noreferrer",
      text: "Abrir portfólio",
    }),
    el("a", {
      class: "btn-pill",
      style:
        "background:rgba(255,255,255,0.12);border:0.5px solid var(--hairline)",
      href: GITHUB,
      target: "_blank",
      rel: "noopener noreferrer",
      text: "Ver GitHub",
    }),
  ]);

  return [toolbar, center];
}

function buildContact() {
  const contactRow = (icon, label, value) =>
    el("div", { class: "contact-row" }, [
      el("span", { class: "ico", text: icon }),
      el("div", {}, [el("small", { text: label }), value]),
    ]);

  return [
    el("div", { class: "app-center" }, [
      el("div", { style: "font-size:2.6rem", text: "✉️" }),
      el("h2", { style: "margin:0;font-size:1.1rem", text: "Contato" }),
      el("div", { class: "contact-list" }, [
        contactRow("📞", "Telefone", el("span", { text: "(61) 99194-2160" })),
        contactRow(
          "✉️",
          "Email",
          el("span", { text: "allysontrabalho7@gmail.com" }),
        ),
        contactRow(
          "📍",
          "Localização",
          el("span", { text: "João Pessoa, PB — Brasil" }),
        ),
        contactRow(
          "💼",
          "LinkedIn",
          el("a", {
            href: LINKEDIN,
            target: "_blank",
            rel: "noopener noreferrer",
            text: "allyson-de-oliveira",
          }),
        ),
        contactRow(
          "🐙",
          "GitHub",
          el("a", {
            href: GITHUB,
            target: "_blank",
            rel: "noopener noreferrer",
            text: "Allysonubius",
          }),
        ),
      ]),
      el("a", {
        class: "btn-pill wa",
        href: "https://wa.me/5561991942160",
        target: "_blank",
        rel: "noopener noreferrer",
        text: "💬 Falar no WhatsApp",
      }),
    ]),
  ];
}

function buildMusic() {
  return [
    el("div", { class: "content-area" }, [
      el("iframe", {
        id: "ytPlayer",
        src: "https://www.youtube-nocookie.com/embed/SJxOaqjeeQ4",
        title: "Player de música",
        allow: "encrypted-media; picture-in-picture",
        referrerpolicy: "strict-origin-when-cross-origin",
        allowfullscreen: "",
        loading: "lazy",
      }),
    ]),
  ];
}

const APPS = {
  about: { icon: "👤", label: "Sobre mim", build: buildAbout },
  portfolio: { icon: "💼", label: "Portfólio", build: buildPortfolio },
  contact: { icon: "✉️", label: "Contato", build: buildContact },
  music: { icon: "🎵", label: "Música", build: buildMusic },
};

/* ------------------------------------------------------------
   Gerenciador de janelas
   ------------------------------------------------------------ */

let zIndex = 100;
let cascade = 0;
const openWindows = new Map(); // id -> { win }

function setActiveAppName(name) {
  $("activeApp").textContent = name;
}

function focusWindow(id) {
  const entry = openWindows.get(id);
  if (!entry) return;
  entry.win.style.display = "flex";
  entry.win.style.zIndex = ++zIndex;
  for (const [key, other] of openWindows) {
    other.win.classList.toggle("is-focused", key === id);
  }
  setActiveAppName(APPS[id].label);
}

function windowControl(kind, symbol, label, onClick) {
  return el(
    "button",
    {
      class: `tl ${kind}`,
      type: "button",
      "aria-label": label,
      title: label,
      onclick: (e) => {
        e.stopPropagation();
        onClick();
      },
    },
    [el("span", { class: "tl-symbol", text: symbol, "aria-hidden": "true" })],
  );
}

function openApp(id) {
  const app = APPS[id];
  if (!app) return;

  closeAllPopovers();

  if (openWindows.has(id)) {
    focusWindow(id);
    return;
  }

  const win = el("div", {
    class: "window",
    role: "dialog",
    "aria-label": app.label,
  });
  win.dataset.app = id;

  // Cascata para não empilhar janelas exatamente no mesmo ponto.
  const offset = (cascade++ % 5) * 30;
  win.style.top = `${64 + offset}px`;
  win.style.left = `${80 + offset}px`;

  const titlebar = el("div", { class: "titlebar" }, [
    el("div", { class: "win-controls" }, [
      windowControl("close", "✕", `Fechar ${app.label}`, () => closeWindow(id)),
      windowControl("minimize", "—", `Minimizar ${app.label}`, () =>
        minimizeWindow(id),
      ),
      windowControl("zoom", "⤢", `Ampliar ${app.label}`, () => toggleZoom(win)),
    ]),
    el("div", { class: "window-title" }, [
      el("span", { "aria-hidden": "true", text: app.icon }),
      el("span", { text: app.label }),
    ]),
    el("div", {}),
  ]);

  win.appendChild(titlebar);

  for (const part of app.build()) {
    if (
      part.classList.contains("app-toolbar") ||
      part.classList.contains("content-area")
    ) {
      win.appendChild(part);
    } else {
      win.appendChild(el("div", { class: "content-area" }, [part]));
    }
  }

  // Duplo clique na barra de título amplia ou restaura a janela.
  titlebar.addEventListener("dblclick", (e) => {
    if (!e.target.closest("button")) toggleZoom(win);
  });

  $("windows").appendChild(win);
  win.addEventListener("mousedown", () => focusWindow(id));
  makeDraggable(win, titlebar);

  openWindows.set(id, { win });
  focusWindow(id);
  syncDockIndicators();
}

function minimizeWindow(id) {
  const entry = openWindows.get(id);
  if (!entry) return;
  const { win } = entry;
  win.classList.add("is-minimizing");
  setTimeout(() => {
    win.classList.remove("is-minimizing");
    win.style.display = "none";
  }, 280);
  win.classList.remove("is-focused");
  setActiveAppName("Início");
}

function closeWindow(id) {
  const entry = openWindows.get(id);
  if (!entry) return;
  entry.win.remove();
  openWindows.delete(id);
  setActiveAppName("Início");
  syncDockIndicators();
}

function toggleZoom(win) {
  if (isMobile()) return;
  if (win.classList.contains("is-maximized")) {
    win.classList.remove("is-maximized");
    Object.assign(win.style, win._restore || {});
  } else {
    win._restore = {
      top: win.style.top,
      left: win.style.left,
      width: win.style.width,
      height: win.style.height,
    };
    win.classList.add("is-maximized");
    Object.assign(win.style, {
      top: "var(--menubar-h)",
      left: "0px",
      width: "100%",
      height: "calc(100% - var(--menubar-h) - var(--dock-h))",
    });
  }
}

/**
 * Arraste por janela. Cada janela registra seus próprios listeners e os
 * remove ao soltar, em vez de sobrescrever handlers globais do document.
 */
function makeDraggable(win, handle) {
  handle.addEventListener("mousedown", (e) => {
    if (e.target.closest("button")) return;
    if (isMobile() || win.classList.contains("is-maximized")) return;

    const offsetX = e.clientX - win.offsetLeft;
    const offsetY = e.clientY - win.offsetTop;
    const menubarH = 28;

    const onMove = (ev) => {
      const maxX = window.innerWidth - win.offsetWidth;
      const maxY = window.innerHeight - win.offsetHeight - 8;
      const x = Math.min(Math.max(ev.clientX - offsetX, 0), Math.max(maxX, 0));
      const y = Math.min(
        Math.max(ev.clientY - offsetY, menubarH),
        Math.max(maxY, menubarH),
      );
      win.style.left = `${x}px`;
      win.style.top = `${y}px`;
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
    };

    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    e.preventDefault();
  });
}

/* ------------------------------------------------------------
   Dock — indicadores e magnificação
   ------------------------------------------------------------ */

function syncDockIndicators() {
  for (const item of document.querySelectorAll(".dock-item[data-open]")) {
    item.classList.toggle("is-running", openWindows.has(item.dataset.open));
  }
}

/** Magnificação: escala cada ícone conforme a distância do cursor. */
function setupDockMagnification() {
  const dock = $("dock");
  const items = [...dock.querySelectorAll(".dock-item")];
  const MAX_SCALE = 0.55;
  const RANGE = 110;

  dock.addEventListener("mousemove", (e) => {
    if (isMobile()) return;
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const distance = Math.abs(e.clientX - center);
      const factor = Math.max(0, 1 - distance / RANGE);
      const scale = 1 + MAX_SCALE * factor * factor;
      item.style.transform = `scale(${scale}) translateY(${-(scale - 1) * 20}px)`;
    }
  });

  dock.addEventListener("mouseleave", () => {
    for (const item of items) item.style.transform = "";
  });
}

/* ------------------------------------------------------------
   Popovers da barra superior
   ------------------------------------------------------------ */

const POPOVERS = [
  ["systemMenu", "systemBtn"],
  ["quickSettings", "settingsBtn"],
  ["newsPanel", "clockBtn"],
];

function closeAllPopovers(except = null) {
  for (const [panelId, btnId] of POPOVERS) {
    if (panelId === except) continue;
    $(panelId).classList.add("hidden");
    $(btnId).setAttribute("aria-expanded", "false");
    $(btnId).classList.remove("is-open");
  }
}

function togglePopover(panelId, btnId) {
  const panel = $(panelId);
  const willOpen = panel.classList.contains("hidden");
  closeAllPopovers(panelId);
  panel.classList.toggle("hidden", !willOpen);
  $(btnId).setAttribute("aria-expanded", String(willOpen));
  $(btnId).classList.toggle("is-open", willOpen);
  return willOpen;
}

function setVolume(value) {
  $("volumeLabel").textContent = `${value}%`;
  $("soundIcon").textContent = Number(value) === 0 ? "🔇" : "🔊";
}

/* ------------------------------------------------------------
   Ligação de eventos
   ------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", () => {
  $("lockForm").addEventListener("submit", (e) => {
    e.preventDefault();
    unlock();
  });

  $("systemBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    togglePopover("systemMenu", "systemBtn");
  });

  $("settingsBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    togglePopover("quickSettings", "settingsBtn");
  });

  $("clockBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    // O feed só é buscado quando o painel de notícias abre pela 1ª vez.
    if (togglePopover("newsPanel", "clockBtn")) loadNews();
  });

  $("lockBtn").addEventListener("click", lockScreen);
  $("prevBtn").addEventListener("click", () => changePage(-1));
  $("nextBtn").addEventListener("click", () => changePage(1));
  $("volumeRange").addEventListener("input", (e) => setVolume(e.target.value));

  for (const btn of document.querySelectorAll("[data-open]")) {
    btn.addEventListener("click", () => openApp(btn.dataset.open));
  }

  for (const btn of document.querySelectorAll("[data-external]")) {
    btn.addEventListener("click", () => openExternal(btn.dataset.external));
  }

  setupDockMagnification();
  $("activeApp").addEventListener("click", () => openApp("about"));
});

// Fecha popovers ao clicar fora.
document.addEventListener("click", (e) => {
  if (!e.target.closest(".popover") && !e.target.closest(".news-panel")) {
    closeAllPopovers();
  }
});

// Atalhos de teclado.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeAllPopovers();
});
