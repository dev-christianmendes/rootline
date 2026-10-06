# Screenshots Directory

Este diretório deve conter os screenshots da aplicação para o README.

## Screenshots Necessários

| Arquivo                       | Descrição                                                                                         | Resolução Sugerida |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | ------------------ |
| `dashboard-overview.png`      | Dashboard principal com health cards, incidentes ativos, tabela de serviços, deployments recentes | 1920x1080          |
| `incident-center.png`         | Incident Center com tabela, filtros, busca, WebSocket indicator                                   | 1920x1080          |
| `incident-detail.png`         | Detalhe do incidente com header, summary, status flow, timeline                                   | 1920x1080          |
| `incident-analysis.png`       | Painel de análise IA com hipóteses, evidências, confidence scores                                 | 1920x1080          |
| `evidence-graph.png`          | Grafo de evidências (React Flow/XYFlow) com nós e edges                                           | 1920x1080          |
| `service-map.png`             | Mapa de serviços (topologia) com health badges e dependências                                     | 1920x1080          |
| `realtime-metrics.png`        | Gráficos de métricas em tempo real via WebSocket                                                  | 1920x1080          |
| `service-detail.png`          | Detalhe do serviço com métricas, logs, traces, deployments                                        | 1920x1080          |
| `investigation-workspace.png` | Workspace de investigação com hipóteses e grafo de evidências                                     | 1920x1080          |
| `deployments.png`             | Timeline de deployments com correlação a incidentes                                               | 1920x1080          |
| `login-page.png`              | Página de login JWT                                                                               | 1920x1080          |
| `new-incident-dialog.png`     | Modal de criação de incidente                                                                     | 1920x1080          |
| `resolve-dialog.png`          | Modal de resolução de incidente                                                                   | 1920x1080          |
| `websocket-status.png`        | Indicadores de conexão WebSocket no dashboard                                                     | 1920x1080          |
| `dark-mode.png`               | Exemplo do modo escuro (default)                                                                  | 1920x1080          |
| `mobile-view.png`             | Responsividade mobile                                                                             | 375x667            |

## Como Capturar

### Via Playwright (Automatizado)

```bash
cd apps/web
npm run test:e2e:ui
# No Playwright UI, clique em "Record" e navegue pelas páginas
# Screenshots são salvos automaticamente em test-results/
```

### Manual (Recomendado para README)

1. Inicie a aplicação: `npm run infra:up && npm run dev`
2. Acesse http://localhost:3000
3. Use ferramenta de screenshot do OS (macOS: Cmd+Shift+4, Windows: Win+Shift+S, Linux: Flameshot)
4. Salve em `docs/assets/screenshots/` com nomes acima

### Dicas de Qualidade

- Use resolução 1920x1080 (ou 2x para retina)
- Capture em modo escuro (default do Rootline)
- Mostre dados realistas (mock data já popula)
- Evite dados sensíveis (senhas, tokens)
- Mostre estados reais: loading, empty, error, success

## Atualização do README

Após adicionar screenshots, o README.md já referencia os caminhos corretos:

```markdown
![Dashboard Overview](docs/assets/screenshots/dashboard-overview.svg)
```

---

**Nota**: Os screenshots não são versionados no git (arquivos grandes).
Adicione ao `.gitignore`:

```
docs/assets/screenshots/*.png
docs/assets/screenshots/*.jpg
```

Ou use Git LFS se versionar for necessário.
