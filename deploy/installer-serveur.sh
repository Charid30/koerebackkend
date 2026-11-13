#!/usr/bin/env bash
# Installation de SOFARY GMAO sur un serveur Debian ou Ubuntu neuf (à lancer en root).
#
#   BRANCHE=main bash installer-serveur.sh
#
# Le script peut être relancé sans risque : il ne refait que ce qui manque.
set -euo pipefail

BRANCHE="${BRANCHE:-main}"
DOSSIER=/opt/sofary
DEPOT_BACKEND=https://github.com/Charid30/koerebackkend.git
DEPOT_FRONTEND=https://github.com/Charid30/koerefrontend.git

etape() { printf '\n\033[1;35m==> %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "À lancer en root (ou avec sudo)."; exit 1; }

etape "Paquets de base et mises à jour de sécurité automatiques"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q ca-certificates curl git openssl ufw unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

etape "Docker (dépôt officiel)"
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  . /etc/os-release   # ID = debian ou ubuntu
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

etape "Pare-feu : SSH, HTTP et HTTPS uniquement"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

etape "Code de l'application (branche ${BRANCHE})"
mkdir -p "$DOSSIER"
for depot in "$DEPOT_BACKEND" "$DEPOT_FRONTEND"; do
  nom=$(basename "$depot" .git)
  if [ -d "$DOSSIER/$nom/.git" ]; then
    git -C "$DOSSIER/$nom" fetch -q origin
    git -C "$DOSSIER/$nom" checkout -q "$BRANCHE"
    git -C "$DOSSIER/$nom" pull -q --ff-only origin "$BRANCHE"
  else
    git clone -q --branch "$BRANCHE" "$depot" "$DOSSIER/$nom"
  fi
done

etape "Configuration et secrets (deploy/.env)"
ENV_FICHIER="$DOSSIER/koerebackkend/deploy/.env"
if [ ! -f "$ENV_FICHIER" ]; then
  IP=$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')
  cat > "$ENV_FICHIER" <<EOF
SITE_ADDRESS=:80
CORS_ORIGINS=http://${IP}
DB_PASSWORD=$(openssl rand -hex 24)
DB_ROOT_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 48)
JWT_REFRESH_SECRET=$(openssl rand -hex 48)
EOF
  chmod 600 "$ENV_FICHIER"
  echo "Secrets générés dans $ENV_FICHIER (lisible par root uniquement)."
else
  echo "$ENV_FICHIER existe déjà : conservé."
fi

etape "Construction et démarrage (quelques minutes la première fois)"
cd "$DOSSIER/koerebackkend/deploy"
docker compose up -d --build

etape "Sauvegarde quotidienne de la base (3 h, conservée 14 jours)"
install -m 0755 "$DOSSIER/koerebackkend/deploy/sauvegarder.sh" /usr/local/bin/sofary-sauvegarde
echo "0 3 * * * root /usr/local/bin/sofary-sauvegarde >> /var/log/sofary-sauvegarde.log 2>&1" > /etc/cron.d/sofary-sauvegarde

etape "Terminé"
docker compose ps
cat <<EOF

L'application est disponible sur : $(grep CORS_ORIGINS "$ENV_FICHIER" | cut -d= -f2)

Créez maintenant le premier compte administrateur :
  cd $DOSSIER/koerebackkend/deploy
  docker compose exec -e ADMIN_EMAIL=vous@exemple.com -e ADMIN_PASSWORD='un-mot-de-passe-solide' api node prisma/creer-admin.js
EOF
