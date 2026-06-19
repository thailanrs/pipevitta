# Diretrizes de Design e Design System — PipeVitta

Este documento define as especificações visuais, tokens de cores, tipografia, iconografia e convenções de estilização para o PipeVitta, baseadas estritamente no sistema **Material Design 3 (MD3)** utilizado nos protótipos de tela.

---

## 🎨 Paleta de Cores e Tokens (Material Design 3)

O sistema de cores utiliza tokens semânticos baseados na especificação oficial do Material Design 3. O tema default é o tema claro (*light*).

### 1. Cores Primárias (Ações principais e Destaque)
| Token | Hexadecimal | Descrição/Uso |
|---|---|---|
| `primary` | `#005ab4` | Cor principal da marca. Usada em botões primários, links e destaques ativos. |
| `primary-container` | `#0a73e0` | Container para componentes com tonalidade primária suave (ex: cards de destaque). |
| `on-primary` | `#ffffff` | Cor do texto/ícone sobre fundo `primary`. |
| `on-primary-container` | `#fefcff` | Cor do texto/ícone sobre fundo `primary-container`. |
| `primary-fixed` | `#d6e3ff` | Cor primária fixa para layouts responsivos. |
| `primary-fixed-dim` | `#aac7ff` | Cor primária fixa com brilho reduzido. |

### 2. Cores Secundárias (Ações secundárias e Elementos de UI)
| Token | Hexadecimal | Descrição/Uso |
|---|---|---|
| `secondary` | `#465f88` | Cor secundária. Usada para itens de navegação selecionados na sidebar. |
| `secondary-container` | `#b6d0ff` | Container secundário (ex: background de itens selecionados). |
| `on-secondary` | `#ffffff` | Cor do texto/ícone sobre fundo `secondary`. |
| `on-secondary-container` | `#3f5881` | Cor do texto/ícone sobre fundo `secondary-container`. |

### 3. Cores Terciárias (Alertas leves, Status alternativos)
| Token | Hexadecimal | Descrição/Uso |
|---|---|---|
| `tertiary` | `#964400` | Tonalidade laranja/âmbar. Usada para status "Operations" ou alertas moderados. |
| `tertiary-container` | `#bd5700` | Container para elementos terciários. |
| `on-tertiary` | `#ffffff` | Texto/ícone sobre fundo `tertiary`. |
| `on-tertiary-container` | `#fffbff` | Texto/ícone sobre fundo `tertiary-container`. |

### 4. Superfícies e Containers (Estrutura do Layout)
| Token | Hexadecimal | Uso no Layout |
|---|---|---|
| `background` | `#f9f9ff` | Cor de fundo principal do canvas/páginas. |
| `surface` | `#f9f9ff` | Fundo base de componentes. |
| `surface-dim` | `#d7dae3` | Superfície com brilho reduzido. |
| `surface-bright` | `#f9f9ff` | Superfície com brilho elevado. |
| `surface-container-lowest` | `#ffffff` | Nível mais baixo de container (ex: cards de conteúdo branco puro). |
| `surface-container-low` | `#f1f3fc` | Container leve (ex: inputs e área de busca). |
| `surface-container` | `#ebedf7` | Container padrão (ex: sidebar de navegação). |
| `surface-container-high` | `#e6e8f1` | Container elevado (ex: hover em menus). |
| `surface-container-highest`| `#e0e2eb` | Nível máximo de container. |

### 5. Contornos, Bordas e Erros
| Token | Hexadecimal | Uso no Layout |
|---|---|---|
| `outline` | `#717785` | Cor de bordas padrão e ícones neutros. |
| `outline-variant` | `#c1c6d5` | Bordas mais suaves e divisores. |
| `error` | `#ba1a1a` | Vermelho de erro. Usado para validações e exclusões. |
| `error-container` | `#ffdad6` | Fundo para mensagens e alertas de erro. |
| `on-error` | `#ffffff` | Texto/ícone sobre fundo `error`. |
| `on-error-container` | `#93000a` | Texto/ícone sobre fundo `error-container`. |

---

## 🔤 Tipografia e Fontes

O sistema utiliza a fonte **Inter** (do Google Fonts) de forma consistente em todo o layout.

* **Headline / Títulos**: `font-headline` (Inter, pesos `600` ou `700`).
* **Body / Textos**: `font-body` (Inter, pesos `400` ou `500`).
* **Display / Números grandes**: `font-display` (Inter, peso `700`).
* **Labels / Tags**: `font-label` (Inter, peso `500`).

### Classes de Tamanho recomendadas:
* Título da Página: `text-headline-md font-bold` (`text-2xl`)
* Título de Seção/Card: `text-base font-semibold`
* Texto de Apoio: `text-xs text-on-surface-variant`
* Badges/Tags: `text-[10px] font-bold`

---

## 📐 Espaçamento e Bordas

* **Bordas Arredondadas (Border Radius)**:
  * Padrão (Cards pequenos, inputs, botões): `rounded` (`0.5rem` / `8px`)
  * Médio (Modais, cards de dashboard): `rounded-lg` (`1rem` / `16px`)
  * Grande (Drawers laterais, FAB): `rounded-xl` (`1.5rem` / `24px` ou `rounded-2xl`)
  * Total (Badges, avatares, pílulas de filtro): `rounded-full` (`9999px`)

* **Gaps e Paddings**:
  * Espaçamento interno de cards: `p-4` ou `p-5`
  * Grid de cartões de métricas: `gap-4`
  * Distância entre seções: `mb-6`

---

## 🌟 Iconografia

O projeto utiliza **Material Symbols Outlined** de forma exclusiva.

```html
<!-- Importação no Head -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
```

### Configurações Padrão CSS para os Ícones:
```css
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
.filled-icon {
  font-variation-settings: 'FILL' 1;
}
```
* **Uso**: Use sempre a tag `<span class="material-symbols-outlined">nome_do_icone</span>`.
* **Estados**: Use a classe `.filled-icon` quando o ícone representar um estado ativo (ex: o link atual selecionado na sidebar).

---

## 🌓 Estrutura para Dark Mode (Fase 2)

Embora o toggle visual seja habilitado na Fase 2, todo componente deve ser implementado pensando em dark mode. Em vez de declarar cores fixas com hexadecimais no CSS, utilize **CSS Variables** configuradas no arquivo global de estilos.

### Configuração do `index.css`:
```css
@theme {
  --color-primary: var(--primary);
  --color-background: var(--background);
  --color-surface: var(--surface);
  --color-on-surface: var(--on-surface);
  /* ... mapear todas as variáveis ... */
}

:root {
  --primary: #005ab4;
  --background: #f9f9ff;
  --surface-container: #ebedf7;
  --on-surface: #181c22;
  /* ... valores Light ... */
}

.dark {
  --primary: #aac7ff;
  --background: #111318;
  --surface-container: #1b1f26;
  --on-surface: #e2e2e9;
  /* ... valores Dark correspondentes do MD3 ... */
}
```
Isso garante que ao adicionar a classe `.dark` na tag `<html>`, toda a interface se adapte instantaneamente sem requerer classes extras do Tailwind em cada elemento do HTML.
