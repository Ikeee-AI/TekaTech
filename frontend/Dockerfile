# TekaTech frontend image: builds the Vite app, then serves it with nginx.
# Production still builds on Render (render.yaml); this image is for judges and local testing.
#
# Vite bakes VITE_* values into the JavaScript AT BUILD TIME, so they are build args,
# not run-time variables (CLAUDE.md, "Gotchas"). They are public values only:
# the Supabase URL, the publishable (anon) key and the API address the BROWSER uses.

FROM node:22.22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_BASE_URL=http://localhost:8000
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY" \
    || (echo "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY build args are required (see .env.example)" && exit 1)
RUN npm run build

FROM nginx:1.27-alpine AS web
# The template is filled in when the container starts (nginx's envsubst step), so the
# CSP can name the API address. Only variables set in the environment are replaced.
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV API_BASE_URL=http://localhost:8000
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
