import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// 개발 중에는 /api 요청을 Vite 개발 서버가 백엔드로 대신 전달한다(프록시).
// 브라우저 입장에서는 same-origin 요청이 되므로 백엔드 CORS 설정과 무관하게 개발할 수 있다.
// 배포 시에는 VITE_API_BASE_URL 을 실제 API 주소로 지정하면 프론트가 직접 호출한다.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const target = env.VITE_DEV_PROXY_TARGET || 'https://api.handover-card.o-r.kr'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: true,
        },
      },
      // 도커의 바인드 마운트(맥/윈도우)에서는 파일 변경 이벤트가 컨테이너까지 오지 않아
      // 핫 리로드가 죽는다. 그 경우에만 폴링으로 바꾼다(호스트 실행에는 영향 없음).
      watch: env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
    },
  }
})
