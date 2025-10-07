# frontend/Dockerfile - ФИНАЛЬНАЯ ЭТАЛОННАЯ ВЕРСИЯ

# --- ЭТАП 1: Сборка React-приложения ---
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем только package.json и package-lock.json для установки зависимостей
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Теперь копируем остальной код приложения
COPY . .
RUN npm run build


# --- ЭТАП 2: Финальный образ с Nginx ---
FROM nginx:stable-alpine

# Копируем результат сборки из первого этапа
COPY --from=builder /app/build /usr/share/nginx/html

# Важно: Эта команда УДАЛЯЕТ стандартный nginx.conf,
# чтобы наш собственный, который мы монтируем через docker-compose, был единственным.
RUN rm /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]