/**
 * 화면에 나가는 모든 문구.
 *
 * 키 문자열 대신 중첩 객체로 두고 `t.login.email` 처럼 쓴다. 오타가 나면 컴파일이 막히고,
 * 자리표시자가 필요한 문구는 함수로 둬서 인자 개수까지 타입이 지켜 준다.
 * `en` 을 `Messages` 로 못박아 두었으므로 한쪽에만 문구를 추가하면 빌드가 깨진다.
 */
const ko = {
  common: {
    cancel: '취소',
    save: '저장',
    none: '없음',
    loadMore: '더 보기',
    backToList: '← 목록으로',
    leaderTag: '팀장',
  },

  nav: {
    cards: '인계 카드',
    team: '팀',
    settings: '설정',
    newCard: '새 인계 남기기',
    logout: '로그아웃',
    language: '언어',
  },

  login: {
    // 반환형을 string 으로 못박는다. 없으면 문자열 리터럴 타입이 잡혀 번역본이 안 맞는다.
    heading: (signup: boolean): string => (signup ? '회원가입' : '로그인'),
    email: '이메일',
    emailPlaceholder: 'you@example.com',
    password: '비밀번호',
    passwordHint: '8자 이상',
    name: '이름',
    namePlaceholder: '카드에 표시될 이름',
    submit: (signup: boolean): string => (signup ? '가입하기' : '로그인'),
    or: '또는',
    continueWith: (provider: string) => `${provider}(으)로 로그인`,
    switchToSignup: '계정이 없나요? ',
    switchToLogin: '이미 계정이 있나요? ',
    signupLink: '회원가입',
    loginLink: '로그인',
    errorShortPassword: '비밀번호는 8자 이상이어야 합니다.',
    errorLogin: '로그인에 실패했습니다.',
    errorSignup: '회원가입에 실패했습니다.',
  },

  oauth: {
    cancelled: '로그인이 취소되었습니다.',
    rejected: (code: string) => `공급자가 요청을 거절했습니다. (${code})`,
    noCode: '인가 코드를 받지 못했습니다.',
    badState:
      'state 검증에 실패했습니다. 로그인 화면에서 다시 시작해 주세요. (다른 탭에서 시작한 요청이거나 만료된 요청입니다)',
    failed: '소셜 로그인에 실패했습니다.',
    toLogin: '로그인 화면으로',
    working: '로그인 중입니다…',
  },

  status: {
    RECEIVED: '업로드 완료',
    TRANSCRIBING: '음성 인식 중',
    TRANSCRIBED: '음성 인식 완료',
    SUMMARIZING: '번역·요약 중',
    COMPLETED: '완료',
    FAILED: '실패',
  },

  cards: {
    title: '인계 카드',
    subtitle: '요약된 인계 카드입니다. 선택하면 전체 내용을 볼 수 있습니다.',
    tabAll: '전체',
    tabSent: '보낸 카드',
    tabReceived: '받은 카드',
    tabTeam: '팀 카드',
    emptyAll: '아직 인계 카드가 없습니다.',
    emptySent: '내가 남긴 인계가 아직 없습니다.',
    emptyReceived: '나에게 온 인계가 아직 없습니다.',
    emptyTeam: '팀원끼리 주고받은 인계가 아직 없습니다.',
    // 「결제팀」 처럼 이미 팀으로 끝나는 이름에 팀을 또 붙이지 않는다.
    teamNote: (team: string) =>
      `${team.endsWith('팀') ? team : `${team}팀`}에 소속된 팀원의 인계 카드입니다.`,
    sameTeam: '같은 팀',
    firstCard: '아직 인계 카드가 없습니다. 아래에서 첫 인계를 남겨 보세요.',
    noSummary: '요약된 내용이 없습니다',
    issue: '이슈 있음',
    issueTitle: '이슈가 있는 인계입니다',
    loadFailed: '카드 목록을 불러오지 못했습니다.',
    loadMoreFailed: '더 불러오지 못했습니다.',
    composeTitle: '새 인계 남기기',
    composeSubtitle: '음성 인식 · 번역 · 요약을 거쳐 인계 카드로 정리됩니다.',
  },

  detail: {
    summary: '요약',
    keyPoints: '핵심 내용',
    actionItems: '할 일',
    issues: '이슈',
    noSummaryTitle: '요약이 만들어지지 않았습니다.',
    noSummaryBody:
      '처리는 끝났지만 서버가 요약을 돌려주지 않았습니다. 녹음에 알아들을 만한 말이 거의 없으면 이렇게 됩니다. 아래 「전체 내용」에 음성 인식 결과가 있으면 인식까지는 된 것입니다.',
    fullText: '전체 내용',
    translated: (language: string) => `${language} 번역`,
    original: (language: string) => `${language} 원문`,
    processingNote: '기다리지 않고 나가도 처리는 계속됩니다. 끝나면 이 화면이 자동으로 채워집니다.',
    stepReceived: '접수',
    stepTranscribing: '음성 인식',
    stepTranslating: '번역',
    stepSummarizing: '요약',
    stepDone: '완료',
    failedTitle: '처리에 실패했습니다',
    noReason: '원인이 기록되지 않았습니다.',
    reprocess: '다시 처리하기',
    reprocessDenied: '이 카드는 재처리할 수 없습니다. 카드를 만든 사람만 다시 처리할 수 있습니다.',
    reprocessFailed: '재처리에 실패했습니다.',
    deleteCard: '카드 삭제',
    confirmDelete: '이 인계 카드를 삭제할까요? 되돌릴 수 없습니다.',
    deleteDenied:
      '이 카드는 삭제할 수 없습니다. 카드를 만든 사람만 삭제할 수 있고, 받은 카드는 보낸 사람에게 삭제를 요청해야 합니다.',
    deleteFailed: '삭제에 실패했습니다.',
    loadFailed: '카드를 불러오지 못했습니다.',

    edit: '결과 수정',
    editNote: '음성 인식이 틀린 곳을 직접 고칠 수 있습니다.',
    editSave: '저장',
    editCancel: '취소',
    editSaved: '고친 내용을 저장했습니다.',
    editDenied: '이 카드는 고칠 수 없습니다. 카드를 만든 사람만 결과를 고칠 수 있습니다.',
    editNotReady: '아직 처리가 끝나지 않아 고칠 수 없습니다. 완료된 뒤에 다시 시도해 주세요.',
    editFailed: '저장에 실패했습니다.',
    editAddEntry: '항목 추가',
    editRemoveEntry: '항목 지우기',
    editEntryHint: '두 칸을 모두 비우면 저장할 때 그 항목이 사라집니다.',
    editTextHint: '전체 내용은 비울 수 없습니다. 비워 두면 원래 내용이 그대로 남습니다.',
    editNoChanges: '고친 곳이 없습니다.',
  },

  compose: {
    sourceTabs: '음성 가져오는 방법',
    record: '직접 녹음',
    upload: '파일 올리기',
    sender: '보내는 사람',
    senderHintPrefix: '',
    settings: '설정',
    senderHintSuffix: '에서 바꿀 수 있습니다',
    noAccountName: '계정에 이름이 없습니다',
    receiver: '받는 사람',
    receiverTeamHint: (team: string) => `${team} 팀원 중에서 고를 수 있습니다.`,
    manualEntry: '직접 입력…',
    receiverName: '받는 사람 이름',
    namePlaceholder: '이름',
    receiverEmail: '받는 사람 이메일',
    optional: '(선택)',
    emailNote: '가입된 이메일이면 그 사람도 카드를 볼 수 있습니다.',
    emailPlaceholder: 'you@example.com',
    sourceLanguage: '녹음한 언어',
    targetLanguage: '번역할 언어',
    submit: '인계 카드 만들기',
    submitting: '올리는 중…',
    errorNoRecording: '먼저 인계 내용을 녹음해 주세요.',
    errorNoFile: '올릴 음성 파일을 선택해 주세요.',
    errorSameLanguage: '원본 언어와 번역 언어를 다르게 선택해 주세요.',
    errorNoSenderName: '계정에 이름이 없습니다. 설정에서 표시 이름을 먼저 정해 주세요.',
    errorCreate: '카드 생성에 실패했습니다.',
    teamLoadFailed: (reason: string) => `팀원 목록을 불러오지 못했습니다: ${reason}`,
    teamLoadFailedPlain: '팀원 목록을 불러오지 못했습니다.',
    lookupNoTeam: '팀에 속해 있지 않아 자동 조회가 안 됩니다. 이메일을 직접 입력해 주세요.',
    lookupFound: (team: string, email: string) => `${team} 팀에서 ${email} 을(를) 찾았습니다.`,
    lookupMissing: (name: string) =>
      `"${name}" 과 이름이 정확히 일치하는 팀원이 없습니다. 이름은 완전 일치만 인식하니 이메일을 직접 입력해 주세요.`,
    lookupFailed: (reason: string, statusCode: number) =>
      `이메일 자동 조회 실패: ${reason} (HTTP ${statusCode})`,
    lookupFailedPlain: '이메일 자동 조회에 실패했습니다. 직접 입력해 주세요.',
  },

  recorder: {
    hintIdle: '인계 내용을 녹음하세요.',
    hintRecording: '편하게 말씀하세요. 다 마치면 네모를 누르세요.',
    hintPaused: '일시정지됨. 이어서 녹음하거나 네모를 눌러 끝낼 수 있습니다.',
    hintDone: '다시 들어보고 아래에서 받는 사람을 지정하세요.',
    start: '녹음 시작',
    finish: '녹음 완료',
    pause: '일시정지',
    resume: '이어서 녹음',
    reRecord: '다시 녹음',
    errorInsecure:
      '이 주소에서는 브라우저가 마이크를 열어주지 않습니다. http://localhost:5173 으로 접속하거나 https 로 배포한 뒤 사용해 주세요.',
    errorUnsupported:
      '이 브라우저는 녹음(MediaRecorder)을 지원하지 않습니다. Chrome 이나 Edge 를 사용해 주세요.',
    errorDenied: '마이크 사용이 차단되어 있습니다. 브라우저 주소창의 권한 설정에서 마이크를 허용해 주세요.',
    errorNoDevice: '사용할 수 있는 마이크를 찾지 못했습니다.',
    errorOpen: '마이크를 열 수 없습니다.',
    errorEmpty:
      '녹음된 소리가 없습니다. 마이크가 음소거돼 있거나 다른 앱이 마이크를 쓰고 있는지 확인한 뒤 다시 시도해 주세요.',
    errorFailed: '녹음 중 오류가 발생했습니다. 다시 시도해 주세요.',
  },

  filePicker: {
    choose: '파일 고르기',
    changeFile: '다른 파일',
    dropHere: '음성 파일을 여기에 끌어다 놓으세요.',
    hintIdle: '미리 준비한 음성을 올릴 수 있습니다.',
    hintReady: '다시 들어보고 아래에서 받는 사람을 지정하세요.',
    errorNotAudio: (type: string) => `오디오 파일이 아닙니다. (${type})`,
    unknownType: '형식 정보 없음',
    errorEmpty: '빈 파일입니다.',
    sizeWarning: (size: string) =>
      `파일이 ${size} 입니다. 업로드와 음성 인식에 시간이 걸릴 수 있고, 서버가 용량을 제한하고 있으면 거부될 수 있습니다.`,
  },

  player: {
    play: '재생',
    pause: '일시정지',
    seek: '재생 위치',
    progress: '재생 진행',
    unknownError: '알 수 없는 오류',
    aborted: 'ABORTED — 로딩이 중단됨',
    network: 'NETWORK — 데이터를 읽지 못함',
    decode: 'DECODE — 파일 내용이 깨졌거나 디코더가 처리하지 못함',
    unsupported: 'SRC_NOT_SUPPORTED — 이 형식을 지원하지 않거나 주소가 유효하지 않음',
    code: (value: number) => `코드 ${value}`,
  },

  select: {
    placeholder: '선택하세요',
  },

  preview: {
    save: '파일 저장',
    noFormat: '(형식 정보 없음)',
    brokenTitle: '이 브라우저에서는 미리듣기가 되지 않습니다.',
    brokenBodyBefore: '파일 자체는 정상일 수 있고 ',
    brokenBodyStrong: '업로드에는 영향이 없습니다.',
    brokenBodyAfter:
      ' 브라우저 내장 재생기가 이 형식을 열지 못하는 것뿐입니다. 확인하려면 위의 「파일 저장」으로 내려받아 다른 재생기로 들어보세요.',
    format: '형식',
  },

  team: {
    title: '팀',
    subtitle: '같은 팀끼리는 인계 카드를 함께 볼 수 있고, 수신자 이메일이 자동으로 채워집니다.',
    loadFailed: '팀 정보를 불러오지 못했습니다.',
    actionFailed: '처리에 실패했습니다.',

    createTitle: '팀 만들기',
    createNote: '팀을 만들면 내가 팀장이 되고, 다른 회원의 가입 신청을 승인할 수 있습니다.',
    nameLabel: '팀 이름',
    namePlaceholder: '결제팀',
    createButton: '팀 만들기',
    createDone: (team: string) => `"${team}" 팀을 만들었습니다.`,

    joinTitle: '팀 가입 신청',
    joinNote: '가입하고 싶은 팀에 신청하면 팀장이 승인한 뒤 팀원이 됩니다.',
    colTeamName: '팀 이름',
    colLeader: '팀장',
    colMembers: '인원',
    colApply: '신청',
    memberCount: (count: number) => `${count}명`,
    apply: '신청',
    ownTeam: '내가 만든 팀',
    alreadyApplied: (team: string) =>
      `이미 "${team}" 팀에 신청해 두었습니다. 대기 중인 신청이 있으면 다른 팀에 신청할 수 없습니다.`,
    noTeams: '아직 만들어진 팀이 없습니다. 위에서 직접 만들어 보세요.',
    applyDone: (team: string) => `"${team}" 팀에 가입을 신청했습니다. 팀장이 승인하면 팀원이 됩니다.`,

    myRequestsTitle: '내 신청 내역',
    myRequestsNote: '내가 보낸 가입 신청과 그 결과입니다. 대기 중인 신청은 취소할 수 있습니다.',
    colTeam: '팀',
    colStatus: '상태',
    colRequestedAt: '신청 일시',
    colCancel: '취소',
    cancelRequest: '신청 취소',
    confirmCancelRequest: (team: string) => `"${team}" 팀 가입 신청을 취소할까요?`,
    cancelRequestDone: (team: string) =>
      `"${team}" 팀 가입 신청을 취소했습니다. 다른 팀에 신청하거나 다시 신청할 수 있습니다.`,
    cancelRequestGone:
      '이미 처리된 신청이라 취소할 수 없습니다. 그 사이에 팀장이 승인하거나 거절한 것입니다.',
    joinPending: '대기 중',
    joinApproved: '승인됨',
    joinRejected: '거절됨',

    summary: (leader: string, count: number, created: string) =>
      `팀장 ${leader} · 팀원 ${count}명 · ${created} 생성`,
    transfer: '팀장 넘기기',
    confirmTransfer: (name: string) => `${name} 님에게 팀장을 넘길까요?`,
    transferDone: (name: string) => `${name} 님이 새 팀장이 되었습니다.`,
    kick: '내보내기',
    confirmKick: (name: string) => `${name} 님을 팀에서 내보낼까요?`,
    kickDone: (name: string) => `${name} 님을 내보냈습니다.`,

    receivedTitle: '받은 가입 신청',
    noPending: '대기 중인 신청이 없습니다.',
    requestedAt: (when: string) => `${when} 신청`,
    approve: '승인',
    approveDone: (name: string) => `${name} 님의 가입을 승인했습니다.`,
    reject: '거절',
    rejectDone: (name: string) => `${name} 님의 신청을 거절했습니다.`,

    dangerTitle: '위험한 작업',
    leaderCannotLeave:
      '팀장은 팀을 나갈 수 없습니다. 다른 팀원에게 팀장을 넘기거나 팀을 삭제해야 합니다. 팀을 삭제하면 모든 팀원의 소속이 해제되지만 인계 카드는 그대로 남습니다.',
    deleteTeam: '팀 삭제',
    confirmDeleteTeam: (team: string) => `"${team}" 팀을 삭제할까요? 되돌릴 수 없습니다.`,
    deleteTeamDone: '팀을 삭제했습니다.',
    leaveNote: '팀을 나가면 이 팀의 인계 카드를 더 이상 볼 수 없습니다.',
    leaveTeam: '팀 나가기',
    confirmLeave: (team: string) => `"${team}" 팀에서 나갈까요?`,
    leaveDone: '팀에서 나왔습니다.',
  },

  settings: {
    title: '계정 설정',
    displayName: '표시 이름',
    nameChanged: '이름을 변경했습니다.',
    nameFailed: '이름 변경에 실패했습니다.',

    passwordTitle: '비밀번호 변경',
    currentPassword: '현재 비밀번호',
    newPassword: '새 비밀번호',
    confirmPassword: '새 비밀번호 확인',
    passwordHint: '8자 이상',
    passwordShort: '새 비밀번호는 8자 이상이어야 합니다.',
    passwordMismatch: '새 비밀번호가 서로 다릅니다.',
    passwordWrong: '현재 비밀번호가 올바르지 않습니다.',
    passwordChanged: '비밀번호를 변경했습니다.',
    passwordFailed: '비밀번호 변경에 실패했습니다.',
    changePassword: '비밀번호 변경',

    dangerTitle: '계정 삭제',
    deleteNote:
      '내가 만든 인계 카드와 음성 파일이 함께 삭제됩니다. 내가 수신자로 연결된 다른 사람의 카드는 연결만 해제되고 삭제되지는 않습니다.',
    deleteAccount: '계정 삭제',
    confirmDelete:
      '계정을 삭제하면 내가 만든 인계 카드와 업로드한 음성이 모두 함께 삭제됩니다. 되돌릴 수 없습니다. 계속할까요?',
    deleteFailed: '계정 삭제에 실패했습니다.',
    joinedAt: (when: string) => `${when} 가입`,
  },

  api: {
    400: '요청 형식이 올바르지 않습니다.',
    401: '인증에 실패했습니다. 다시 로그인해 주세요.',
    403: '권한이 없습니다.',
    404: '대상을 찾을 수 없습니다.',
    409: '현재 상태에서는 처리할 수 없는 요청입니다.',
    413: '파일 용량이 너무 큽니다.',
    loginRequired: '로그인이 필요합니다.',
    sessionExpired: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  },

  time: {
    justNow: '방금 전',
  },
}

export type Messages = typeof ko

const en: Messages = {
  common: {
    cancel: 'Cancel',
    save: 'Save',
    none: 'None',
    loadMore: 'Load more',
    backToList: '← Back to list',
    leaderTag: 'Lead',
  },

  nav: {
    cards: 'Handovers',
    team: 'Team',
    settings: 'Settings',
    newCard: 'New handover',
    logout: 'Log out',
    language: 'Language',
  },

  login: {
    heading: (signup: boolean) => (signup ? 'Create account' : 'Log in'),
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    password: 'Password',
    passwordHint: 'At least 8 characters',
    name: 'Name',
    namePlaceholder: 'Name shown on your cards',
    submit: (signup: boolean) => (signup ? 'Create account' : 'Log in'),
    or: 'or',
    continueWith: (provider: string) => `Continue with ${provider}`,
    switchToSignup: "Don't have an account? ",
    switchToLogin: 'Already have an account? ',
    signupLink: 'Sign up',
    loginLink: 'Log in',
    errorShortPassword: 'Password must be at least 8 characters.',
    errorLogin: 'Could not log in.',
    errorSignup: 'Could not create the account.',
  },

  oauth: {
    cancelled: 'Login was cancelled.',
    rejected: (code: string) => `The provider rejected the request. (${code})`,
    noCode: 'No authorization code was returned.',
    badState:
      'State verification failed. Please start again from the login screen. (The request came from another tab or has expired.)',
    failed: 'Social login failed.',
    toLogin: 'Back to login',
    working: 'Logging you in…',
  },

  status: {
    RECEIVED: 'Uploaded',
    TRANSCRIBING: 'Transcribing',
    TRANSCRIBED: 'Transcribed',
    SUMMARIZING: 'Translating & summarizing',
    COMPLETED: 'Done',
    FAILED: 'Failed',
  },

  cards: {
    title: 'Handovers',
    subtitle: 'Each card is a summary. Open one to read the full handover.',
    tabAll: 'All',
    tabSent: 'Sent',
    tabReceived: 'Received',
    tabTeam: 'Team',
    emptyAll: 'No handover cards yet.',
    emptySent: "You haven't left a handover yet.",
    emptyReceived: 'Nothing has been handed over to you yet.',
    emptyTeam: 'Your teammates have not exchanged any handovers yet.',
    teamNote: (team: string) => `Handovers between members of ${team}.`,
    sameTeam: 'your team',
    firstCard: 'No handover cards yet. Leave your first one below.',
    noSummary: 'No summary available',
    issue: 'Has an issue',
    issueTitle: 'This handover reports an issue',
    loadFailed: 'Could not load your handover cards.',
    loadMoreFailed: 'Could not load more cards.',
    composeTitle: 'New handover',
    composeSubtitle: 'Speech is transcribed, translated, and summarized into a handover card.',
  },

  detail: {
    summary: 'Summary',
    keyPoints: 'Key points',
    actionItems: 'Action items',
    issues: 'Issues',
    noSummaryTitle: 'No summary was produced.',
    noSummaryBody:
      'Processing finished, but the server returned no summary. This happens when the recording contains little intelligible speech. If the full text below has a transcript, speech recognition itself worked.',
    fullText: 'Full text',
    translated: (language: string) => `${language} translation`,
    original: (language: string) => `${language} original`,
    processingNote:
      'You can leave this page — processing continues. This screen fills in automatically when it finishes.',
    stepReceived: 'Received',
    stepTranscribing: 'Transcribing',
    stepTranslating: 'Translating',
    stepSummarizing: 'Summarizing',
    stepDone: 'Done',
    failedTitle: 'Processing failed',
    noReason: 'No reason was recorded.',
    reprocess: 'Try again',
    reprocessDenied: 'This card cannot be reprocessed. Only the person who created it can retry.',
    reprocessFailed: 'Could not reprocess the card.',
    deleteCard: 'Delete card',
    confirmDelete: 'Delete this handover card? This cannot be undone.',
    deleteDenied:
      'This card cannot be deleted. Only the person who created it can delete it — ask the sender to remove a card you received.',
    deleteFailed: 'Could not delete the card.',
    loadFailed: 'Could not load this card.',

    edit: 'Edit results',
    editNote: 'You can correct what speech recognition got wrong.',
    editSave: 'Save',
    editCancel: 'Cancel',
    editSaved: 'Your changes were saved.',
    editDenied: 'This card cannot be edited. Only the person who created it can fix the results.',
    editNotReady:
      'Processing has not finished yet, so this card cannot be edited. Try again once it completes.',
    editFailed: 'Could not save your changes.',
    editAddEntry: 'Add item',
    editRemoveEntry: 'Remove item',
    editEntryHint: 'Clearing both fields removes that item when you save.',
    editTextHint: 'The full text cannot be emptied — leave it blank and the original stays.',
    editNoChanges: 'Nothing was changed.',
  },

  compose: {
    sourceTabs: 'How to provide audio',
    record: 'Record',
    upload: 'Upload a file',
    sender: 'From',
    senderHintPrefix: 'change in ',
    settings: 'Settings',
    senderHintSuffix: '',
    noAccountName: 'Your account has no name',
    receiver: 'To',
    receiverTeamHint: (team: string) => `Pick anyone on ${team}.`,
    manualEntry: 'Enter manually…',
    receiverName: 'Recipient name',
    namePlaceholder: 'Name',
    receiverEmail: 'Recipient email',
    optional: '(optional)',
    emailNote: 'If the email belongs to a member, they can open this card too.',
    emailPlaceholder: 'you@example.com',
    sourceLanguage: 'Spoken language',
    targetLanguage: 'Translate into',
    submit: 'Create handover card',
    submitting: 'Uploading…',
    errorNoRecording: 'Record your handover first.',
    errorNoFile: 'Choose an audio file to upload.',
    errorSameLanguage: 'Pick a different language to translate into.',
    errorNoSenderName: 'Your account has no name. Set a display name in Settings first.',
    errorCreate: 'Could not create the card.',
    teamLoadFailed: (reason: string) => `Could not load your teammates: ${reason}`,
    teamLoadFailedPlain: 'Could not load your teammates.',
    lookupNoTeam: "You're not on a team, so lookup is unavailable. Enter the email directly.",
    lookupFound: (team: string, email: string) => `Found ${email} on ${team}.`,
    lookupMissing: (name: string) =>
      `No teammate is named exactly "${name}". Lookup requires an exact match, so enter the email directly.`,
    lookupFailed: (reason: string, statusCode: number) =>
      `Email lookup failed: ${reason} (HTTP ${statusCode})`,
    lookupFailedPlain: 'Email lookup failed. Please enter the address directly.',
  },

  recorder: {
    hintIdle: 'Record your handover.',
    hintRecording: 'Speak naturally. Press the square when you are done.',
    hintPaused: 'Paused. Resume, or press the square to finish.',
    hintDone: 'Play it back, then choose a recipient below.',
    start: 'Start recording',
    finish: 'Finish recording',
    pause: 'Pause',
    resume: 'Resume recording',
    reRecord: 'Record again',
    errorInsecure:
      'The browser will not open a microphone on this address. Use http://localhost:5173 or deploy over https.',
    errorUnsupported:
      'This browser does not support recording (MediaRecorder). Please use Chrome or Edge.',
    errorDenied:
      'Microphone access is blocked. Allow the microphone in your browser’s address-bar permissions.',
    errorNoDevice: 'No usable microphone was found.',
    errorOpen: 'Could not open the microphone.',
    errorEmpty:
      'Nothing was recorded. Check whether the microphone is muted or in use by another app, then try again.',
    errorFailed: 'Recording failed. Please try again.',
  },

  filePicker: {
    choose: 'Choose a file',
    changeFile: 'Choose another',
    dropHere: 'Drop an audio file here.',
    hintIdle: 'Upload audio you prepared earlier.',
    hintReady: 'Play it back, then choose a recipient below.',
    errorNotAudio: (type: string) => `That is not an audio file. (${type})`,
    unknownType: 'unknown type',
    errorEmpty: 'That file is empty.',
    sizeWarning: (size: string) =>
      `This file is ${size}. Upload and transcription may take a while, and the server may reject it if it limits file size.`,
  },

  player: {
    play: 'Play',
    pause: 'Pause',
    seek: 'Seek',
    progress: 'Playback progress',
    unknownError: 'Unknown error',
    aborted: 'ABORTED — loading was interrupted',
    network: 'NETWORK — the data could not be read',
    decode: 'DECODE — the file is corrupt or the decoder could not handle it',
    unsupported: 'SRC_NOT_SUPPORTED — this format is unsupported or the address is invalid',
    code: (value: number) => `code ${value}`,
  },

  select: {
    placeholder: 'Select',
  },

  preview: {
    save: 'Save file',
    noFormat: '(unknown format)',
    brokenTitle: 'This browser cannot play the preview.',
    brokenBodyBefore: 'The file itself may be fine, and ',
    brokenBodyStrong: 'uploading is unaffected.',
    brokenBodyAfter:
      ' The built-in player simply cannot open this format. To check, save the file with the link above and open it in another player.',
    format: 'Format',
  },

  team: {
    title: 'Team',
    subtitle:
      'Teammates can read each other’s handover cards, and recipient emails fill in automatically.',
    loadFailed: 'Could not load team information.',
    actionFailed: 'That did not work.',

    createTitle: 'Create a team',
    createNote:
      'Creating a team makes you its lead, so you can approve join requests from other members.',
    nameLabel: 'Team name',
    namePlaceholder: 'Payments',
    createButton: 'Create team',
    createDone: (team: string) => `Created the team "${team}".`,

    joinTitle: 'Join a team',
    joinNote: 'Request to join a team, and you become a member once the lead approves.',
    colTeamName: 'Team',
    colLeader: 'Lead',
    colMembers: 'Members',
    colApply: 'Request',
    memberCount: (count: number) => `${count}`,
    apply: 'Request',
    ownTeam: 'Your own team',
    alreadyApplied: (team: string) =>
      `You have already applied to "${team}". You cannot apply elsewhere while a request is pending.`,
    noTeams: 'No teams exist yet. Create one above.',
    applyDone: (team: string) =>
      `Requested to join "${team}". You become a member once the lead approves.`,

    myRequestsTitle: 'Your requests',
    myRequestsNote:
      'Join requests you have sent and how they were handled. Pending requests can be cancelled.',
    colTeam: 'Team',
    colStatus: 'Status',
    colRequestedAt: 'Requested',
    colCancel: 'Cancel',
    cancelRequest: 'Cancel request',
    confirmCancelRequest: (team: string) => `Cancel your request to join "${team}"?`,
    cancelRequestDone: (team: string) =>
      `Cancelled your request to join "${team}". You can now apply to another team or try again.`,
    cancelRequestGone:
      'This request has already been handled — the team lead approved or declined it in the meantime.',
    joinPending: 'Pending',
    joinApproved: 'Approved',
    joinRejected: 'Declined',

    summary: (leader: string, count: number, created: string) =>
      `Lead ${leader} · ${count} members · created ${created}`,
    transfer: 'Make lead',
    confirmTransfer: (name: string) => `Hand the team lead over to ${name}?`,
    transferDone: (name: string) => `${name} is now the team lead.`,
    kick: 'Remove',
    confirmKick: (name: string) => `Remove ${name} from the team?`,
    kickDone: (name: string) => `Removed ${name} from the team.`,

    receivedTitle: 'Join requests',
    noPending: 'No pending requests.',
    requestedAt: (when: string) => `requested ${when}`,
    approve: 'Approve',
    approveDone: (name: string) => `Approved ${name}.`,
    reject: 'Decline',
    rejectDone: (name: string) => `Declined ${name}’s request.`,

    dangerTitle: 'Danger zone',
    leaderCannotLeave:
      'A team lead cannot leave. Hand the lead over to someone else, or delete the team. Deleting removes everyone from the team, but handover cards stay.',
    deleteTeam: 'Delete team',
    confirmDeleteTeam: (team: string) => `Delete the team "${team}"? This cannot be undone.`,
    deleteTeamDone: 'Deleted the team.',
    leaveNote: 'If you leave, you can no longer read this team’s handover cards.',
    leaveTeam: 'Leave team',
    confirmLeave: (team: string) => `Leave the team "${team}"?`,
    leaveDone: 'You left the team.',
  },

  settings: {
    title: 'Account settings',
    displayName: 'Display name',
    nameChanged: 'Name updated.',
    nameFailed: 'Could not update your name.',

    passwordTitle: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    passwordHint: 'At least 8 characters',
    passwordShort: 'The new password must be at least 8 characters.',
    passwordMismatch: 'The new passwords do not match.',
    passwordWrong: 'That current password is not correct.',
    passwordChanged: 'Password updated.',
    passwordFailed: 'Could not change your password.',
    changePassword: 'Change password',

    dangerTitle: 'Delete account',
    deleteNote:
      'Your handover cards and uploaded audio are deleted with the account. Cards from other people that list you as recipient stay — you are only unlinked from them.',
    deleteAccount: 'Delete account',
    confirmDelete:
      'Deleting your account also deletes every handover card you created and the audio you uploaded. This cannot be undone. Continue?',
    deleteFailed: 'Could not delete the account.',
    joinedAt: (when: string) => `Joined ${when}`,
  },

  api: {
    400: 'The request was not formed correctly.',
    401: 'Authentication failed. Please log in again.',
    403: 'You do not have permission for that.',
    404: 'That could not be found.',
    409: 'That request cannot be handled in the current state.',
    413: 'That file is too large.',
    loginRequired: 'Please log in.',
    sessionExpired: 'Your session expired. Please log in again.',
  },

  time: {
    justNow: 'just now',
  },
}

export type Lang = 'ko' | 'en'

export const MESSAGES: Record<Lang, Messages> = { ko, en }

/** 화면에 보여줄 언어 이름. 어느 쪽을 쓰든 자기 이름으로 적는다. */
export const LANG_LABEL: Record<Lang, string> = { ko: '한국어', en: 'English' }

/*
 * React 밖에서 쓰는 문구용 통로.
 *
 * api/client.ts 나 lib/format.ts 처럼 훅을 쓸 수 없는 자리에서도 같은 문구가 필요하다.
 * LanguageProvider 가 언어를 바꿀 때마다 이 값을 함께 갱신한다.
 */
let activeLang: Lang = 'ko'

export function setActiveLang(lang: Lang): void {
  activeLang = lang
}

export function getActiveLang(): Lang {
  return activeLang
}

export function messages(): Messages {
  return MESSAGES[activeLang]
}
