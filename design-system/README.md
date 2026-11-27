# `@voffice/design-system` — Contrato Web & React Native

Pacote compartilhado de tokens, temas e configuração Tamagui do **Setter — Escritório Virtual**, projetado para ser 100% agnóstico de plataforma em `src/tokens/`, `src/themes/` e `src/tamagui.config.ts`.

## Pontos de entrada (`exports`)

| Import                           | Uso                                                                                 | Plataforma         |
| -------------------------------- | ----------------------------------------------------------------------------------- | ------------------ |
| `@voffice/design-system`         | Tokens (`SPACING`, `RADII`, `TYPOGRAPHY`, `MOTION`), presets e `resolveThemeTokens` | Web + React Native |
| `@voffice/design-system/tamagui` | Instância `tamaguiConfig` com 11 presets (`dark` e `light`)                         | Web + React Native |
| `@voffice/design-system/web`     | `applyThemeCssVariables` (escreve variáveis CSS em `:root`)                         | Somente Web (DOM)  |

## Consumo no futuro app React Native / Expo

1. **Nunca importe `@voffice/design-system/web` no app mobile** — apenas `src/web/` acessa `document`.
2. Envolva o app raiz com `<TamaguiProvider config={tamaguiConfig} defaultTheme={themeKey}>` usando `tamaguiConfig` de `@voffice/design-system/tamagui`.
3. Para componentes customizados ou gráficos/canvas, use `resolveThemeTokens(presetId, mode, customColors)` de `@voffice/design-system` para obter cores com contraste WCAG AA garantido (`ensureContrast`).
4. Para layout responsivo mobile, reutilize `MOBILE_BREAKPOINTS`, `MOBILE_METRICS` e `MOBILE_NAV_TABS` de `@voffice/design-system`.
