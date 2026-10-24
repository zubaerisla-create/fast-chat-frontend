#!/usr/bin/env bash
# Forced command for the website's GitHub Actions deploy key (see authorized_keys on the VPS).
# Installed at /var/www/fast-chat-website/deploy.sh. The key can only run:   deploy <40-char git sha>
# stdin: gzipped tarball of the Next.js standalone build.
set -euo pipefail
base=/var/www/fast-chat-website
port=3010
app=fast-chat-website

read -r cmd sha extra <<< "${SSH_ORIGINAL_COMMAND:-}"
if [[ "${cmd:-}" != "deploy" || ! "${sha:-}" =~ ^[0-9a-f]{40}$ || -n "${extra:-}" ]]; then
  echo "usage: deploy <git-sha>" >&2
  exit 2
fi

release="$base/releases/$sha"
rm -rf "$release.tmp"
mkdir -p "$release.tmp"
head -c 200M | tar -xz -C "$release.tmp" --no-same-owner
[[ -f "$release.tmp/server.js" ]] || { echo "bundle has no server.js" >&2; rm -rf "$release.tmp"; exit 1; }
rm -rf "$release"
mv "$release.tmp" "$release"

previous=$(readlink -f "$base/current" || true)
switch_to() {
  ln -sfn "$1" "$base/current.new"
  mv -T "$base/current.new" "$base/current"
  if pm2 describe "$app" >/dev/null 2>&1; then
    pm2 restart "$app" --update-env >/dev/null
  else
    PORT=$port HOSTNAME=127.0.0.1 NODE_ENV=production \
      pm2 start "$base/current/server.js" --name "$app" --cwd "$base/current" >/dev/null
  fi
}
switch_to "$release"

for _ in $(seq 1 30); do
  if curl -fs -o /dev/null "http://127.0.0.1:$port/"; then
    pm2 save >/dev/null
    # Keep the three newest releases plus whatever is live
    ls -1dt "$base"/releases/*/ | tail -n +4 | while read -r old; do
      [[ "$(readlink -f "$old")" == "$(readlink -f "$base/current")" ]] || rm -rf "$old"
    done
    echo "Deployed $sha — healthy"
    exit 0
  fi
  sleep 2
done

echo "Deploy of $sha is unhealthy; recent logs:" >&2
pm2 logs "$app" --lines 60 --nostream >&2 || true
if [[ -n "$previous" && -d "$previous" && "$previous" != "$release" ]]; then
  echo "Rolling back to $previous" >&2
  switch_to "$previous"
fi
exit 1
