FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --fund=false

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["sh", "-c", "printf 'window.__RUNTIME_CONFIG__={\"VITE_SUPABASE_URL\":\"%s\",\"VITE_SUPABASE_PROJECT_ID\":\"%s\",\"VITE_SUPABASE_PUBLISHABLE_KEY\":\"%s\",\"VITE_SUPABASE_ANON_KEY\":\"%s\"};\\n' \"${VITE_SUPABASE_URL:-$SUPABASE_URL}\" \"${VITE_SUPABASE_PROJECT_ID:-$SUPABASE_PROJECT_ID}\" \"${VITE_SUPABASE_PUBLISHABLE_KEY:-${SUPABASE_PUBLISHABLE_KEY:-$SUPABASE_ANON_KEY}}\" \"${VITE_SUPABASE_ANON_KEY:-$SUPABASE_ANON_KEY}\" > dist/runtime-config.js && serve -s dist -l ${PORT}"]
