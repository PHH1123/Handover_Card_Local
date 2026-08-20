# syntax=docker/dockerfile:1

# ---------- 공통: 의존성 ----------
# 소스보다 훨씬 덜 바뀌는 계층이라 따로 떼어 둔다(캐시).
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------- dev: Vite 개발 서버 ----------
# compose 에서 소스를 바인드 마운트하므로 여기 COPY 한 소스는 사실상 초기값이다.
# (마운트 없이 이 이미지만 단독으로 돌려도 뜨게 하려고 넣어 둔다)
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---------- build: 정적 산출물 ----------
FROM deps AS build
COPY . .
# VITE_API_BASE_URL 을 비워 둔 채 빌드해야 프론트가 same-origin(/api)으로 부르고,
# 아래 nginx 가 그걸 백엔드로 넘긴다(배포 구성과 동일).
ENV VITE_API_BASE_URL=""
RUN npm run build

# ---------- static: 배포와 같은 형태로 확인 ----------
FROM nginx:1.27-alpine AS static
COPY deploy/nginx.docker.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
