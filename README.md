# Kemo Expedition (冒ケモ)

Text-based deterministic fantasy RPG expedition game inspired by 冒険者ギルド物語2.

## Features

- **Deterministic Battles** - No randomness in battle calculations, all outcomes are predetermined
- **Party Management** - Manage up to 6 characters with customizable races, classes, and equipment
- **Auto-Resolving Expeditions** - Battles progress automatically, 5 seconds per room
- **Equipment System** - Collect and equip items to boost party stats
- **Clean iOS-like UI** - White background, black text, blue accents

## Setup

### Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview build
npm run preview
```

Visit `http://localhost:5173` in your browser.

## Deployment

This project automatically deploys to GitHub Pages on every push to `claude/review-game-ui-spec-FQKya`.

### Manual Deployment Steps

1. Ensure GitHub Pages is enabled in repository settings:
   - Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` (will be created automatically by GitHub Actions)

2. Push to the branch:
```bash
git push origin claude/review-game-ui-spec-FQKya
```

3. GitHub Actions will automatically:
   - Build the project
   - Deploy to `https://toreniaFournieri.github.io/Kemo-Expedition/`

### Troubleshooting

- **404 on GitHub Pages**: Check that the `base` path in `vite.config.ts` matches your repository name
- **Build fails**: Check the Actions tab in your repository for error logs
- **Static assets missing**: Ensure `dist/` folder was generated locally with `npm run build`
