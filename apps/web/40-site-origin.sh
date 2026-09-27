#!/bin/sh
set -eu

if ! printf '%s' "${SITE_ORIGIN:-}" | grep -Eq '^https://[A-Za-z0-9.-]+(:[0-9]+)?$'; then
  echo 'SITE_ORIGIN must be set to the public HTTPS origin without a trailing slash' >&2
  exit 1
fi

find /usr/share/nginx/html -type f \( -name '*.html' -o -name 'sitemap.xml' -o -name 'robots.txt' \) \
  -exec sed -i "s|__SITE_ORIGIN__|$SITE_ORIGIN|g" {} +
