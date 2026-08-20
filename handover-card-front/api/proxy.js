/*
 * 배포 환경에서 /api/* 요청을 백엔드로 넘기는 프록시.
 *
 * 왜 함수로 넘기나 —
 * vercel.json 의 rewrite 로 백엔드에 바로 넘기면 브라우저가 보낸 Origin 헤더가
 * 그대로 따라간다. 백엔드는 허용 목록에 없는 Origin 을 보면 엔드포인트에 닿기도
 * 전에 "Invalid CORS request" 로 막는다. 브라우저는 같은 도메인이라도
 * POST·PUT·DELETE 에는 Origin 을 붙이고 GET 에는 붙이지 않아서, 화면은 뜨는데
 * 로그인·회원가입만 죽는 형태로 나타났다.
 *
 * 왜 파일명이 [...path].js 가 아닌가 —
 * 대괄호 catch-all 은 이 프로젝트(Vite) 에서 Vercel 이 함수로 인식하지 못했다.
 * 그래서 평범한 파일명을 쓰고, 경로는 vercel.json 의 rewrite 가 p 파라미터로
 * 넘겨준다.
 *
 * 백엔드가 배포 도메인을 CORS 허용 목록에 넣어 주면 이 파일과 아래 rewrite 를
 * 지우고 원래 방식으로 되돌리면 된다.
 *   { "source": "/api/:path*", "destination": "https://api.handover-card.o-r.kr/api/:path*" }
 */

export const config = { runtime: 'edge' }

const BACKEND = 'https://api.handover-card.o-r.kr'

export default async function handler(request) {
  const url = new URL(request.url)

  // rewrite 가 넘겨준 원래 경로. /api/auth/login 이면 p = "auth/login"
  const params = new URLSearchParams(url.search)
  const path = params.get('p') ?? ''
  params.delete('p') // 백엔드에 넘길 쿼리에서는 뺀다

  // rewrite 가 경로를 안 넘겨줬다는 뜻. 원인을 알아볼 수 있게 그대로 말해 준다.
  if (!path || path.includes(':path')) {
    return json(500, {
      message: '프록시가 요청 경로를 받지 못했습니다. vercel.json 의 rewrite 를 확인하세요.',
      received: url.pathname + url.search,
    })
  }

  const query = params.toString()
  const target = BACKEND + '/api/' + path + (query ? '?' + query : '')

  const headers = new Headers(request.headers)
  // 백엔드의 CORS 필터가 보고 막는 헤더들. 서버에서 서버로 가는 요청이라 뗀다.
  headers.delete('origin')
  headers.delete('referer')
  // 프록시 자신의 주소라 백엔드에 넘기면 안 된다
  headers.delete('host')
  headers.delete('x-forwarded-host')

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'

  let upstream
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      // 녹음 파일을 메모리에 다 올리지 않도록 본문은 스트림 그대로 넘긴다.
      // 스트림을 본문으로 쓸 때는 duplex 를 명시해야 한다.
      body: hasBody ? request.body : undefined,
      duplex: 'half',
      redirect: 'manual',
    })
  } catch (err) {
    // 프록시가 맨 500 을 내면 원인이 프론트처럼 보인다.
    // client.ts 가 message 키를 먼저 읽으므로 그 형식으로 준다.
    return json(502, { message: '서버에 연결할 수 없습니다. (' + err.message + ')' })
  }

  const resHeaders = new Headers(upstream.headers)
  // fetch 가 압축을 이미 풀어 준 본문이라, 원본 헤더를 그대로 두면 길이가 어긋난다
  resHeaders.delete('content-encoding')
  resHeaders.delete('content-length')
  resHeaders.delete('transfer-encoding')

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  })
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
