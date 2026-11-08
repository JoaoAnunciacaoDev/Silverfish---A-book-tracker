# Projeto — Plataforma de Incentivo à Leitura

## 1. Visão geral

Desenvolvimento de uma plataforma web voltada ao incentivo à leitura e à construção de hábitos de leitura.

A proposta combina elementos de gamificação, acompanhamento de progresso, biblioteca pessoal, diário de leitura e funcionalidades sociais.

A experiência será inspirada em mecânicas de aplicativos como Duolingo, especialmente no sistema de ofensivas (*streaks*), metas diárias e acompanhamento de evolução.

### Objetivos

- Incentivar a criação e manutenção do hábito de leitura.
- Permitir o acompanhamento da evolução individual.
- Oferecer ferramentas para organização de livros.
- Promover interação entre leitores.
- Incentivar a leitura por meio de metas, conquistas e rankings.
- Permitir que usuários reflitam sobre suas experiências de leitura.

---

## 2. Stack tecnológica

### Frontend

| Tecnologia | Finalidade |
|---|---|
| mise | Gerenciamento de versões e ambiente |
| Bun | Runtime e gerenciamento de pacotes |
| TypeScript | Linguagem de programação |
| React | Biblioteca de interface |
| Vite | Build e desenvolvimento |
| Oxlint | Lint e análise estática |

Tecnologias complementares consideradas:
- TanStack Query: gerenciamento de requisições e cache.
- Tailwind CSS: estilização.
- PWA: instalação e experiência semelhante a aplicativo.

### Backend

| Tecnologia | Finalidade |
|---|---|
| Go | Linguagem de programação |
| Gin Gonic | Framework HTTP |
| GORM | ORM |
| SQLite | Banco para testes locais |
| PostgreSQL | Banco de produção |

### Notificações

- Service Workers.
- Web Push API.
- VAPID.
- Worker para processamento de notificações agendadas.

### Arquitetura

Monólito modular, com frontend independente consumindo uma API REST.

```text
Frontend (React + TypeScript)
          |
          | HTTP / REST
          |
Backend (Go + Gin)
          |
          +-- Auth
          +-- Users
          +-- Books
          +-- Library
          +-- Reading
          +-- Goals
          +-- Statistics
          +-- Social
          +-- Ranking
          +-- Notifications
          +-- Changelog
          |
          +-- PostgreSQL
```

SQLite poderá ser utilizado em testes unitários e desenvolvimento local, enquanto PostgreSQL será utilizado em integração e produção.

---

## 3. Funcionalidades

### 3.1. Gamificação e metas

Sistema responsável por incentivar a leitura diária.

Funcionalidades:
- Definição de meta diária de páginas.
- Registro da quantidade de páginas lidas por dia.
- Acompanhamento do progresso diário.
- Sistema de ofensivas (*streaks*).
- Recorde pessoal de ofensiva.
- Histórico de metas cumpridas.
- Conquistas e medalhas.
- Possibilidade de alterar a meta diária.

#### Regras de negócio

- Um dia de leitura não significa necessariamente um dia de meta cumprida.
- O usuário pode ler mesmo sem atingir sua meta.
- A ofensiva será baseada no cumprimento da meta diária.
- A contagem deverá respeitar o fuso horário do usuário.
- Alterações retroativas deverão seguir regras específicas para evitar inconsistências.

### 3.2. Biblioteca pessoal

Sistema de organização dos livros de cada usuário.

Categorias:
- Quero ler.
- Lendo.
- Lidos.
- Favoritos.
- Pausados.
- Abandonados.
- Coleção (livros que possui no acervo pessoal, sem leitura ativa).

Avaliações e resenhas:
- Avaliação para livros lidos com notas de 0 a 10 estrelas.
- Comentários e resenhas limitados a 1.000 caracteres.
- Registro de datas de criação e edição.
- Suporte a múltiplas avaliações ao longo do tempo (releituras).

Informações dos livros:
- Título.
- Autor.
- Capa.
- Descrição.
- Quantidade de páginas.
- Gênero.
- Outras informações bibliográficas.

Cada usuário terá seu próprio progresso de leitura para cada livro.

O cadastro bibliográfico deverá ser independente da biblioteca pessoal, permitindo que vários usuários adicionem o mesmo livro sem duplicar seu cadastro global.

### 3.3. Diário de leitura

Sistema de registro das sessões de leitura realizadas pelos usuários.

Informações de cada registro:
- Livro relacionado.
- Página inicial.
- Página final.
- Quantidade de páginas lidas.
- Data e horário.
- Compreensão do conteúdo.
- Sentimento durante a leitura.
- Anotações pessoais opcionais.

Regras:
- Permitir múltiplas sessões no mesmo dia.
- Somar automaticamente as páginas lidas nas sessões.
- Atualizar o progresso do livro.
- Verificar se a meta diária foi cumprida.
- Atualizar o histórico de leitura e a ofensiva.

### 3.4. Sistema social

Permitir interação entre usuários.

Funcionalidades:
- Perfis públicos ou privados.
- Seguir e deixar de seguir usuários.
- Visualizar estatísticas públicas.
- Feed de atividades dos usuários seguidos.
- Rankings entre seguidores.

Tipos de atividades no feed:
- Início da leitura de um livro.
- Conclusão de um livro.
- Meta diária cumprida.
- Conquista de uma nova ofensiva.
- Publicação de um registro de leitura.

Possíveis funcionalidades futuras:
- Curtidas.
- Comentários.
- Compartilhamento de conquistas.

### 3.5. Rankings

Rankings entre seguidores, considerando três critérios:

1. Maior quantidade de livros concluídos no mês.
2. Maior quantidade de páginas lidas no mês.
3. Maior ofensiva atual.

Os rankings deverão considerar períodos definidos e regras consistentes de contabilização.

### 3.6. Dashboard e estatísticas

Dashboard individual com informações sobre a evolução da leitura.

Indicadores:
- Livros concluídos por ano.
- Páginas lidas por ano.
- Páginas lidas por mês.
- Páginas lidas por semana.
- Média diária de páginas.
- Ofensiva atual.
- Recorde pessoal de ofensiva.
- Quantidade de dias com meta cumprida.
- Evolução da leitura ao longo do tempo.

Visualizações:
- Gráficos de evolução.
- Comparativos entre períodos.
- Calendário de contribuições no estilo GitHub, indicando a intensidade de leitura por dia.

### 3.7. Notificações

Notificações push para incentivar a leitura e informar atividades sociais.

Tipos:
- Lembrete diário de leitura.
- Notificação de meta diária pendente.
- Notificação de atividades de usuários seguidos.

Configurações:
- Ativar ou desativar notificações.
- Definir horário dos lembretes.
- Gerenciar inscrições de notificações por dispositivo.

Implementação utilizando Web Push API, Service Workers e VAPID.

### 3.8. Patch notes

Área independente para publicação de atualizações da plataforma.

Informações:
- Número da versão.
- Data de publicação.
- Novidades.
- Melhorias.
- Correções.
- Alterações importantes.

As publicações também poderão aparecer no feed geral, diferenciadas das atividades dos usuários.

### 3.9. Autenticação e autorização

Sistema de autenticação e gerenciamento de permissões.

Roles iniciais:
- `USER`: usuário comum.
- `SUPERUSER`: administrador da plataforma.

O controle de acesso deverá considerar também as configurações de privacidade e as permissões de cada recurso.

---

## 4. Organização dos módulos do backend

| Módulo | Responsabilidade |
|---|---|
| Auth | Autenticação e autorização |
| Users | Perfis e configurações |
| Books | Catálogo de livros |
| Library | Biblioteca pessoal |
| Reading | Sessões e registros de leitura |
| Goals | Metas e ofensivas |
| Statistics | Estatísticas e dashboards |
| Social | Seguidores e feed |
| Ranking | Classificações |
| Notifications | Notificações |
| Changelog | Patch notes |

A organização deverá manter as responsabilidades separadas, sem necessidade de transformar cada funcionalidade em um serviço independente.

---

## 5. Roadmap de desenvolvimento

### Fase 1 — Fundação e funcionalidades essenciais

- [x] Configuração do ambiente com mise.
- [x] Configuração do frontend.
- [x] Configuração do backend.
- [x] Configuração dos bancos de dados.
- [x] Estrutura inicial da API.
- [x] Autenticação e usuários.
- [x] Cadastro de livros.
- [x] Biblioteca pessoal.
- [x] Registro de sessões de leitura.
- [x] Definição de metas diárias.
- [x] Sistema de ofensivas.

### Fase 2 — Acompanhamento e estatísticas

- [x] Dashboard individual.
- [x] Estatísticas por período.
- [x] Diário de leitura.
- [x] Calendário de contribuições.
- [x] Sistema de conquistas.
- [x] Histórico de leitura.

### Fase 3 — Funcionalidades sociais

- [x] Perfis públicos.
- [x] Configurações de privacidade.
- [x] Sistema de seguidores.
- [x] Feed de atividades.
- [x] Rankings entre seguidores.

### Fase 4 — Engajamento e administração

- [x] Notificações push.
- [x] Lembretes configuráveis.
- [x] Publicação de patch notes.
- [x] Integração das patch notes com o feed.
- [x] Sistema de administração.
- [x] Gerenciamento de usuários.

### Fase 5 — Melhorias futuras

- [ ] Sistema expandido de conquistas.
- [ ] Curtidas e comentários.
- [ ] PWA aprimorada.
- [ ] Melhorias de acessibilidade e experiência mobile.

---

## 6. Diretrizes técnicas e regras importantes

### Ofensivas

A ofensiva deverá ser calculada considerando o histórico de metas cumpridas, o fuso horário do usuário e possíveis alterações retroativas.

### Registros de leitura

O sistema deverá aceitar múltiplas sessões por dia, consolidando automaticamente as páginas lidas.

### Livros

O catálogo bibliográfico deverá ser independente da biblioteca pessoal. O progresso de leitura pertence ao relacionamento entre usuário e livro.

### Bancos de dados

Manter compatibilidade entre SQLite e PostgreSQL sempre que possível, utilizando migrações versionadas e testes de integração com PostgreSQL.

### Arquitetura

Manter o projeto como monólito modular inicialmente. Evitar complexidade prematura com microserviços, filas distribuídas e infraestrutura desnecessária.

### Privacidade

O usuário deverá ter controle sobre a visibilidade de seu perfil, biblioteca, registros e estatísticas.

---

## 7. Princípios do produto

1. Incentivar a leitura, não transformar o hábito em obrigação.
2. Valorizar a consistência, não somente a quantidade de páginas.
3. Permitir que o usuário acompanhe sua própria evolução.
4. Utilizar a gamificação como incentivo, não como punição.
5. Promover interação social sem comprometer a privacidade.
6. Manter uma experiência simples, intuitiva e acessível.

**Objetivo principal:** construir uma plataforma que ajude pessoas a desenvolverem e manterem o hábito de leitura, oferecendo ferramentas para acompanhar sua evolução e compartilhar suas experiências com outros leitores.
