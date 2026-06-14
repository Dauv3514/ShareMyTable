# Déploiement VPS - RamèneTaPoire

Ce projet est prévu pour être déployé sur un VPS Linux avec Docker, Docker Compose, Nginx et Certbot. Le frontend, le backend et PostgreSQL sont isolés dans Docker. Nginx reste installé sur le VPS et sert de reverse proxy HTTPS.

## Pré-requis VPS

- VPS Linux avec Docker et Docker Compose installés
- Nginx installé sur le VPS
- Certbot installé
- Un sous-domaine pointant vers l'IP du VPS

Exemple DNS Hostinger :

```text
Type: A
Name: ramenetapoire
Points to: 185.98.138.157
TTL: 14400
```

## Fichiers importants

```text
docker-compose.yml
.env.example
backend/Dockerfile
frontend/Dockerfile
deploy.md
```

Le fichier `.env` réel ne doit jamais être versionné. Il doit être créé à partir de `.env.example`.

## Variables principales

En production, garder :

```env
NODE_ENV=production
API_GLOBAL_PREFIX=api
TYPEORM_SYNCHRONIZE=false
FRONTEND_URL=https://ramenetapoire.bouchard-mehdi.fr
BACKEND_URL=https://ramenetapoire.bouchard-mehdi.fr
NEXT_PUBLIC_API_URL=https://ramenetapoire.bouchard-mehdi.fr/api
NEXT_PUBLIC_BACKEND_URL=https://ramenetapoire.bouchard-mehdi.fr
INTERNAL_API_URL=http://backend:5001/api
```

`TYPEORM_SYNCHRONIZE=false` évite que TypeORM modifie automatiquement le schéma de base en production. Les changements de base devront ensuite passer par migrations ou scripts SQL contrôlés.

## Installation

```bash
cd /home/projects
git clone <repo>
cd ShareMyTable
cp .env.example .env
nano .env
docker compose up -d --build
```

Vérifier les conteneurs :

```bash
docker compose ps
docker compose logs --tail=100
```

Tester en local sur le VPS :

```bash
curl -I http://127.0.0.1:8088
curl -I http://127.0.0.1:3008/api/health
```

## Volumes persistants

Deux volumes sont créés :

- `postgres_data` : données PostgreSQL
- `backend_uploads` : photos de profil, photos logement et autres uploads

Ne pas supprimer ces volumes sauf reset volontaire de l'environnement.

## Configuration Nginx

Créer `/etc/nginx/sites-available/ramenetapoire` :

```nginx
server {
    listen 80;
    server_name ramenetapoire.bouchard-mehdi.fr;

    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://127.0.0.1:3008/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3008/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3008/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    location / {
        proxy_pass http://127.0.0.1:8088;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
```

Activer la configuration :

```bash
sudo ln -s /etc/nginx/sites-available/ramenetapoire /etc/nginx/sites-enabled/ramenetapoire
sudo nginx -t
sudo systemctl reload nginx
```

Générer le certificat SSL :

```bash
sudo certbot --nginx -d ramenetapoire.bouchard-mehdi.fr
```

Choisir la redirection HTTP vers HTTPS.

## PWA, géolocalisation et notifications

HTTPS est obligatoire pour :

- installation PWA
- notifications push
- géolocalisation
- service worker

Les clés VAPID doivent être renseignées dans `.env` :

```env
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:contact@ramenetapoire.fr
```

## Mise à jour

```bash
cd /home/projects/ShareMyTable
git pull
docker compose up -d --build
docker compose logs --tail=50
```

Éviter `docker compose down` sauf changement majeur de ports, réseau ou reset volontaire. `up -d --build` reconstruit les images et remplace les conteneurs sans supprimer les volumes.

## Points à vérifier avant vraie production

- Remplacer tous les secrets dans `.env`
- Vérifier les callbacks Google/Apple avec le préfixe `/api`
- Vérifier Stripe et le webhook HTTPS
- Préparer une stratégie de migration SQL avant de désactiver définitivement `synchronize`
- Sauvegarder régulièrement le volume PostgreSQL
- Sauvegarder régulièrement le volume uploads
