# Handover Card — 로컬 통합 실행

백엔드(`Handover_Card`)와 프론트(`handover-card-front`)를 도커 컴포즈로 한 번에 띄운다.

```bash
docker compose up -d --build   # 처음 한 번 (이미지를 만들어야 해서 인터넷 필요)
docker compose up -d           # 그 뒤로는 이걸로. 이미 만든 이미지를 쓰므로 오프라인에서도 뜬다
```

`--build`는 **이미지를 새로 만들 때만** 붙인다. Gradle·npm이 의존성을 받아 와야 해서 인터넷이 필요하고,
소스나 `package.json`을 고쳤을 때가 그 경우다. 설정(`.env`)만 바꿨다면 `--build` 없이 다시 띄우면 된다.
인터넷이 없는 자리에서 시연한다면 [오프라인 시연](#오프라인-시연)을 먼저 읽을 것.

| 주소 | 내용 |
| --- | --- |
| http://localhost:5173 | 프론트 (Vite 개발 서버, 소스 수정 시 핫 리로드) |
| http://localhost:8080 | 백엔드 API + Thymeleaf 확인용 화면 |
| http://localhost:8080/swagger-ui/index.html | API 문서 |
| http://localhost:9001 | MinIO 콘솔 (`handover` / `handover-secret`) |
| localhost:3306 | MySQL (`handover` / `handover`, DB `handover_card`) |

정지는 `docker compose down`, DB·오디오 데이터까지 지우려면 `docker compose down -v`.

## 무엇이 로컬로 도는가

원래 외부에 붙던 것들을 전부 컨테이너로 대체했다.

| 대상 | 원래 | 로컬 |
| --- | --- | --- |
| DB | 운영 MySQL | `db` 컨테이너 (MySQL 8.0) |
| 오디오 저장소 | AWS S3 | `storage` 컨테이너 (MinIO, 같은 S3 API) |
| 프론트가 부르는 API | `https://api.handover-card.o-r.kr` | Vite 프록시 → `backend:8080` |

프론트는 `VITE_API_BASE_URL`을 비운 채로 돌아 `/api`를 같은 오리진으로 부르고, 그 요청을
Vite 개발 서버가 `backend` 컨테이너로 넘긴다. 브라우저 입장에서는 same-origin이라 CORS가 끼어들지 않는다.

밖으로 나가는 호출은 OpenAI(전사·요약)만 남고, 기본값은 `mock`이라 **API 키 없이도 파이프라인이 끝까지 돈다.**

## 오프라인 시연

인터넷이 전혀 없는 자리에서도 전 기능을 보여줄 수 있도록 맞춰 뒀다.

```bash
docker compose up -d      # --build 없이! 빌드는 인터넷이 되는 곳에서 미리 해 둔다
```

- 전사·요약: `Handover_Card/.env`의 `TRANSCRIPTION_PROVIDER=mock`, `SUMMARIZATION_PROVIDER=mock`
  → OpenAI를 부르지 않고 가짜 결과로 카드가 `COMPLETED`까지 간다.
- 소셜 로그인: 같은 파일에서 `GOOGLE_*` / `GITHUB_*`를 주석 처리해 뒀다. 브라우저가 공급자 사이트에
  직접 다녀와야 하는 흐름이라 오프라인에서는 반드시 실패하기 때문이고, 주석 상태면 로그인 화면에
  버튼 자체가 나오지 않는다. 인터넷이 되는 곳에서 다시 쓰려면 주석만 풀면 된다.
- DB·오디오 저장소·API 호출은 전부 컨테이너 안에서 끝난다. 화면이 쓰는 폰트·스크립트도 모두 번들에
  들어 있어 CDN을 타지 않는다.

**미리 준비해야 할 것** — 이미지 빌드(`--build`)와 프론트 의존성 설치는 네트워크가 필요하다.
현장에 가기 전에 한 번 돌려 두면 그 뒤로는 `docker compose up -d`만으로 뜬다.

```bash
docker compose --profile static build   # 이미지 6개(백엔드/프론트/정적/mysql/minio/mc) 준비
docker compose up -d && docker compose ps   # 잘 뜨는지 확인 후 down
```

시연 중 데이터를 초기화하려면 `docker compose down -v && docker compose up -d` (이때도 네트워크 불필요).

## 설정 값

| 파일 | 용도 | 커밋 |
| --- | --- | --- |
| `docker/backend.env` | 백엔드 로컬 기본값 (provider=mock, 개발용 JWT 키 등) | O |
| `Handover_Card/.env` | 개인 비밀 값 (OpenAI 키, OAuth 클라이언트). 있으면 위를 덮어쓴다 | X |
| `.env` (루트, 선택) | DB·MinIO 계정/버킷. `.env.example` 참고 | X |

컨테이너 네트워크에 맞춰야 하는 값(DB 주소, S3 엔드포인트, DB·S3 계정)은 `docker-compose.yml`의
`environment`가 고정하므로, 개인 `.env`에 배포용 주소가 남아 있어도 로컬 컨테이너를 본다.

실제 OpenAI를 태우려면 `Handover_Card/.env`에:

```bash
OPENAI_API_KEY=sk-...
TRANSCRIPTION_PROVIDER=openai
SUMMARIZATION_PROVIDER=openai
```

소셜 로그인은 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GITHUB_*`를 같은 파일에 넣으면 된다.
**쓰지 않을 공급자는 변수 자체를 정의하지 말 것** — 빈 값으로 두면 스프링이 `Client id must not be empty`로
기동에 실패한다. 리다이렉트 URI는 `http://localhost:8080/login/oauth2/code/{google|github}`.

## 자주 쓰는 명령

```bash
docker compose logs -f backend          # 백엔드 로그
docker compose up -d backend            # .env 만 고쳤을 때 (빌드 없음 → 오프라인 OK)
docker compose up -d --build backend    # 백엔드 소스를 고쳤을 때 (인터넷 필요)
docker compose restart frontend         # 프론트 개발 서버 재시작
docker compose exec db mysql -uhandover -phandover handover_card   # DB 접속
```

프론트 의존성(`package.json`)을 바꿨다면 이미지도 다시 만들어야 한다(인터넷 필요).
`node_modules`는 호스트 것과 섞이지 않게 named volume에 들어 있으므로 한 번 비워 준다.

```bash
docker compose down
docker volume rm handover-card_frontend-node-modules
docker compose up -d --build
```

## 배포와 같은 형태로 확인하기

개발 서버 대신 **빌드된 정적 파일 + nginx**(운영과 같은 구조)로 띄우려면:

```bash
docker compose --profile static up -d --build frontend-static   # http://localhost:4173
docker compose --profile static up -d frontend-static           # 이미 빌드해 뒀다면 (오프라인 OK)
```

`/api`는 nginx가 `backend:8080`으로 프록시한다(`handover-card-front/deploy/nginx.docker.conf`).

## 참고

- 백엔드 상세: [Handover_Card/DEVELOPMENT.md](Handover_Card/DEVELOPMENT.md)
- 도커 없이 백엔드만 로컬에서 띄우는 방법(`./gradlew bootRun` + `Handover_Card/docker-compose.yml`)도 그대로 유효하다.
