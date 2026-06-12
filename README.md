# RamèneTaPoire

RamèneTaPoire est une application fullstack permettant à des utilisateurs de trouver, réserver et organiser des repas chez l'habitant. Le projet contient :

- un backend NestJS avec TypeORM et PostgreSQL ;
- un frontend Next.js / React avec SCSS modules ;
- une messagerie temps réel via Socket.IO ;
- une PWA avec installation, notifications push et page hors connexion ;
- une base de déploiement Docker pour VPS Linux avec Nginx.

## Structure

```text
backend/             API NestJS
frontend/            WebApp Next.js
docker-compose.yml   Orchestration production
.env.example         Variables attendues
deploy.md            Guide de déploiement VPS
docs/                Documents de projet
```

## Démarrage production Docker

Créer d'abord le fichier d'environnement :

```bash
cp .env.example .env
```

Modifier les secrets dans `.env`, puis lancer :

```bash
docker compose up -d --build
```

Les ports sont exposés uniquement sur `127.0.0.1` :

- frontend : `127.0.0.1:8088`
- backend : `127.0.0.1:3008`

La base PostgreSQL et les uploads sont persistés dans des volumes Docker.

## Déploiement VPS

Le guide complet est disponible dans [deploy.md](deploy.md).

Points importants :

- utiliser HTTPS avec Certbot ;
- proxyfier `/api/`, `/uploads/` et `/socket.io/` vers le backend ;
- garder `TYPEORM_SYNCHRONIZE=false` en production ;
- ne jamais versionner le fichier `.env` réel.
