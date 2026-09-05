# 틈픽 0.2 — Android app

기존 틈픽 디자인, 메뉴 카드, 주문 진행 화면을 유지하면서 설치형 Android 앱과 독립적인 회원 계정으로 확장했습니다. Capacitor가 React 화면을 APK 내부에 패키징합니다. 시작 화면을 원격 웹 URL로 여는 방식이 아니며 server.url은 설정하지 않았습니다. 서버는 기존 Sites/D1을 재사용합니다.

## 앱 다운로드 및 QR

- [Android 테스트 APK 다운로드](https://github.com/Rlatldn18/teumpick/raw/refs/heads/main/public/downloads/teumpick-0.2.0.apk)
- [QR 이미지](docs/teumpick-download-qr.png)

![틈픽 APK 다운로드 QR](docs/teumpick-download-qr.png)

QR은 기존 앱 서버의 APK 다운로드 주소로 연결됩니다. Android 전용 테스트 APK이며 iPhone에는 설치할 수 없습니다.

## 구현
- 구매자·판매자별 회원가입, 이메일/비밀번호 로그인. ChatGPT 인증 제거.
- Scrypt(N=32768,r=8,p=3), 임의 salt, 세션 토큰 해시 저장, 로그인 제한, 7일 만료.
- Android Keystore AES-GCM 암호화 세션 보관. 브라우저 미리보기는 HttpOnly cookie.
- 최초 발급 복구 코드로 비밀번호 재설정, 모든 기존 세션 폐기. 로그아웃, 비밀번호 재확인 회원 탈퇴.
- 판매자별 실제 매장/대표 메뉴/가격/준비 시간/접수 설정, 공개 가게 목록.
- 구매자와 해당 판매자 사이 주문 공유. 서버에서 계정 역할과 소유권 검사.
- 가격 변조/가격 변경 차단, 요청 ID 중복 주문 방지, 역 전체 12칸 보관함 유일성.
- 주문 접수/준비/이동/입고/수령, 시간 연장, 접수 단계 취소.
- 구매자에게만 입고 후 수령 코드 공개. 잘못된 코드 반복 제한.
- 하단 탭, 시스템 안전 영역, Android 뒤로가기, 앱 아이콘과 시작 화면.
- 인터넷 권한만 사용. 평문 HTTP와 앱 백업 비활성화.
- 앱 내 개인정보 안내 및 /privacy, 앱 외부 계정 삭제 진입 /account/delete.

## 실행/빌드
Node >=22.13, JDK 21, Android SDK 36.

- npm install
- npm run dev — 기존 UI/서버 개발 미리보기
- npm run build — 서버 배포 출력
- npm run build:mobile — 앱에 내장할 UI
- npx cap sync android — 안드로이드 자산/플러그인 동기화
- android/gradlew.bat -p android assembleDebug bundleRelease
- scripts/build-android.ps1 — 프로젝트 안에 도구가 설치된 환경용

APK는 테스트용 debug 서명입니다. AAB는 업로드 키 서명 전이며 스토어에 업로드하지 않았습니다. 실제 출시 시 조직의 패키지 ID와 업로드 키를 확정하고 환경 변수를 통한 signingConfig를 추가해야 합니다. 비밀 키는 저장소에 넣지 않습니다.

## 검증
- TypeScript, 작성한 app/server/db/lib lint, 서버 빌드 및 모바일 번들 빌드
- npm audit --omit=dev: 운영 의존성 알려진 취약점 0개 (2026-09-05). 빌드 도구를 포함한 전체 트리에는 별도 개발 의존성 진단이 남음.
- tests/mobile-api.mjs: 로컬 실제 Worker/D1에서 18개 통합 그룹. 신규 계정4개를 생성하고 테스트 후 삭제. API 인증/역할/소유권, 공유 주문, 금액, 중복 요청, 보관함 12칸 만석, 준비시간 변경, 수령코드, 취소, 비밀번호 복구, 삭제, 외부 origin 차단.
- 재실행 시 로컬 가입 제한(시간당8회)에 걸릴 수 있음. 운영 데이터의 제한을 낮추지 말 것.
- Gradle assembleDebug / bundleRelease 및 Android 릴리스 필수 lint.
- 실기기/에뮬레이터 설치·터치·키보드 테스트는 아직 수행하지 않음.
- WebMCP 메뉴 열기 도구는 유지했으나 지원 컨텍스트가 없어 호출 검증하지 않음.
- 생성된 미사용 shadcn 컴포넌트에는 기존 전체 lint 진단이 남아 있음.

## 현재 외부 연동 범위
정식 상용 출시 완료 상태로 표현하면 안 됩니다. 주문은 무료 시험 주문이고 결제/환불/푸시 알림/이메일 소유권 검증/실제 보관함 센서·개방은 연결되지 않았습니다. 매장 주소·판매자 신원은 자동 검증되지 않으며 메뉴 사진은 명시된 예시 이미지입니다. 메뉴 관리는 매장당 대표 메뉴 1개입니다. 개인정보 안내는 실제 저장 동작을 설명하는 시험 운영 초안이며 정식 운영자의 연락처·보관 기간·위탁/국외 이전 상세 등 확정이 필요합니다. 진행 중인 주문이 있는 계정은 주문 처리 후 탈퇴 가능합니다. 기존 ChatGPT 기반 pilot 데이터는 변경하지 않고 신규 계정 데이터와 분리했습니다.

## 참고한 흐름/요건
- Too Good To Go: 주변 가게 탐색 → 예약 → 지정 시간 수령 https://www.toogoodtogo.com/en-us/how-does-the-app-work
- Google Play target API: https://developer.android.com/google/play/requirements/target-sdk (2026-09-05 확인, target API 36)
- 계정 삭제: https://support.google.com/googleplay/android-developer/answer/13327111
- Capacitor 8: https://capacitorjs.com/docs/updating/8-0
- 비밀번호 보관: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

