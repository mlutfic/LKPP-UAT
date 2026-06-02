#!/usr/bin/env bash

set -euo pipefail

UAT_ALIAS="${VERCEL_UAT_ALIAS:-lkpp-antrean-uat.vercel.app}"
PRODUCTION_SOURCE="${VERCEL_PRODUCTION_SOURCE:-web-three-beta-15.vercel.app}"

printf 'Deploying current workspace to Vercel production...\n'
npx --yes vercel --prod

printf 'Updating UAT alias %s -> %s...\n' "$UAT_ALIAS" "$PRODUCTION_SOURCE"
npx --yes vercel alias set "$PRODUCTION_SOURCE" "$UAT_ALIAS"

printf 'UAT is now available at https://%s\n' "$UAT_ALIAS"
