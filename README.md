# Wixia · Sistema Inteligente de Gestión de Declaraciones Aduaneras

Piloto del **módulo 01 · Tránsito** para Wixia. Un operador crea un
expediente, adjunta la documentación aduanera (factura, CMR, B/L,
certificados, ICS2…) y la plataforma clasifica cada documento, extrae los
campos y consolida la declaración de tránsito NCTS lista para revisar
antes de volcarla al sistema S-4.

- **Framework**: Laravel 13 + Inertia 2 + React 19 (TypeScript)
- **UI**: Tailwind 4 · tipografía Ubuntu · paleta azul cobalto Wixia
- **BBDD**: SQLite (para el piloto)
- **IA**: OpenAI GPT-5 mini con salida JSON estricta
- **Auth**: Laravel Fortify (email + passkeys + 2FA opcional)

## Requisitos

- PHP ≥ 8.3 (recomendado 8.4)
- Composer 2.7+
- Node 20+ (LTS) y npm
- Herramientas: `poppler-utils` (para `pdftotext`), `sqlite3`, `git`

## Puesta en marcha local

```bash
git clone https://github.com/Sxmpl3/facturaci-n_maritima.git wixia-transito
cd wixia-transito

composer install
npm install
cp .env.example .env
php artisan key:generate

# Añade tu OPENAI_API_KEY en .env (modelo por defecto: gpt-5-mini)

# BBDD SQLite
touch database/database.sqlite
php artisan migrate --seed
php artisan storage:link

npm run build
PHP_CLI_SERVER_WORKERS=4 php -d max_execution_time=0 artisan serve --no-reload
```

Usuario demo (creado por el seed):

- Correo: `operador@wixia.es`
- Contraseña: `wixia2026`

## Flujo funcional

1. **Alta de expediente** — referencia `WX-AAAA-####-XXX` automática.
2. **Subida de documentos** — drag&drop, PDF, imagen o texto.
3. **Análisis IA** — cada documento se clasifica (factura, CMR, B/L,
   certificado sanitario, ICS2…) y se extraen los campos con `json_schema`
   estricto contra la Chat Completions API.
4. **Consolidación** — un segundo prompt cruza toda la información y
   propone la declaración de tránsito completa con nivel de confianza.
5. **Revisión y validación** — el operador ajusta campos, valida y el
   expediente queda con trazabilidad completa (historial + estados).

## Despliegue en un servidor Ubuntu con Nginx

Guía end-to-end para publicar en `facturacionmaritima.wixia.es`.

### 1) Dependencias del servidor

```bash
sudo apt update
sudo apt install -y nginx git curl unzip php8.3-fpm php8.3-cli \
    php8.3-mbstring php8.3-xml php8.3-sqlite3 php8.3-curl \
    php8.3-intl php8.3-zip php8.3-gd php8.3-bcmath \
    poppler-utils sqlite3

# Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Node 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2) Clonar y preparar el proyecto

```bash
sudo mkdir -p /var/www/facturacionmaritima
sudo chown -R $USER:www-data /var/www/facturacionmaritima
cd /var/www

git clone https://github.com/Sxmpl3/facturaci-n_maritima.git facturacionmaritima
cd facturacionmaritima

composer install --no-dev --optimize-autoloader
npm ci
npm run build

cp .env.example .env
php artisan key:generate

# EDITA .env:
#   APP_URL=https://facturacionmaritima.wixia.es
#   APP_ENV=production
#   APP_DEBUG=false
#   OPENAI_API_KEY=sk-...   ← la clave real
#   OPENAI_MODEL=gpt-5-mini

# BBDD SQLite
touch database/database.sqlite
php artisan migrate --seed --force
php artisan storage:link

# Cachés de producción
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Permisos correctos para PHP-FPM (www-data)
sudo chown -R www-data:www-data storage bootstrap/cache database
sudo chmod -R 775 storage bootstrap/cache
sudo chmod 664 database/database.sqlite
sudo chmod 775 database
```

### 3) Bloque Nginx

Crea `/etc/nginx/sites-available/facturacionmaritima.wixia.es`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name facturacionmaritima.wixia.es;

    root /var/www/facturacionmaritima/public;
    index index.php;

    charset utf-8;
    client_max_body_size 25M;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        # OpenAI puede tardar 60-90s con documentos grandes
        fastcgi_read_timeout 180s;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Cache agresivo para los assets de Vite
    location ^~ /build/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Activa el sitio y recarga Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/facturacionmaritima.wixia.es \
           /etc/nginx/sites-enabled/facturacionmaritima.wixia.es
sudo nginx -t
sudo systemctl reload nginx
```

### 4) Certificado TLS con Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d facturacionmaritima.wixia.es \
     --redirect --agree-tos -m tecnologia@wixia.es --no-eff-email
sudo systemctl reload nginx
```

Verifica la renovación automática:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

### 5) Ajustes de PHP-FPM

Edita `/etc/php/8.3/fpm/php.ini` (y `pool.d/www.conf` si separas pools) y
asegúrate de:

```
upload_max_filesize = 25M
post_max_size = 30M
memory_limit = 512M
max_execution_time = 180
```

Reinicia PHP-FPM:

```bash
sudo systemctl restart php8.3-fpm
```

### 6) Comprobación

- Abre https://facturacionmaritima.wixia.es → debe redirigir a `/login`.
- Entra con `operador@wixia.es / wixia2026`.
- Crea un expediente, sube una factura o CMR y pulsa **Analizar con IA**.

### 7) Actualizaciones futuras

```bash
cd /var/www/facturacionmaritima
git pull
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan config:cache route:cache view:cache
sudo chown -R www-data:www-data storage bootstrap/cache database
```

Opcional — hook: crea `deploy.sh` con lo anterior y ejecútalo desde un webhook.

## Estructura

```
app/
├── Http/Controllers/
│   ├── ExpedienteController.php   ← index / show / crear / validar
│   └── DocumentoController.php    ← upload / analizar / borrar
├── Services/
│   ├── OpenAIService.php          ← wrapper HTTP con json_schema
│   ├── DocumentoAnalyzer.php      ← clasifica + extrae por documento
│   └── DeclaracionBuilder.php     ← consolida en la declaración final
├── Models/
│   ├── Expediente.php · Documento.php · Declaracion.php · HistorialEvento.php
resources/js/
├── layouts/transito/shell.tsx     ← shell interior con sidebar navy
└── pages/transito/
    ├── index.tsx        ← panel + tabla de expedientes
    ├── nuevo.tsx        ← alta
    └── expediente.tsx   ← workspace (documentos + editor + historial)
```

## Créditos

Piloto operativo desarrollado para Wixia · Operational Intelligence & AI.
