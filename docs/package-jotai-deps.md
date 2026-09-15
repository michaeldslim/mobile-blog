# package.json — Jotai 의존성 추가 & Zustand 제거 (Phase 0)

> **Phase 0** — 동작 변경 없이 Jotai 인프라만 준비합니다.  
> 관련 코드: `package.json`, `App.tsx` (Provider 추가)

---

## 1. 이 파일의 역할

`package.json`은 프로젝트가 **어떤 외부 라이브러리에 의존하는지** 선언하는 manifest입니다.  
Phase 0에서는 두 가지를 합니다.

1. **`jotai` 추가** — 앞으로 Context 대신 쓸 전역 상태 라이브러리
2. **`zustand` 제거** — `package.json`에만 있고 코드에서 한 번도 import하지 않던 미사용 의존성

이 단계만으로는 테마·인증 로직이 바뀌지 않습니다. Context Provider는 그대로 두고, Jotai `<Provider>`만 나란히 올려 **공존**시킵니다.

---

## 2. Jotai 개념 (Phase 0에서 쓰는 것)

| 개념 | Phase 0에서의 상태 | 설명 |
|------|-------------------|------|
| **`jotai` 패키지** | ✅ 설치 | atom 기반 상태 관리 코어 |
| **`Provider`** | ✅ `App.tsx`에 추가 | atom store의 React 트리 범위를 정의 |
| **`atom`** | ⏳ Phase 1~3 | 아직 선언하지 않음 |
| **`useAtom` / `useAtomValue`** | ⏳ Phase 1~3 | 아직 사용하지 않음 |

### Jotai란?

**atom**이라는 작은 상태 단위를 조합해 전역 상태를 만드는 라이브러리입니다.

- React **Context**: Provider 하나 + value 객체 → value가 바뀌면 구독 컴포넌트가 re-render
- **Jotai**: atom마다 독립 구독 → 필요한 atom만 읽는 컴포넌트만 re-render (Phase 1 이후 체감)

### Provider가 필요한 이유

Jotai는 기본적으로 **모듈 레벨 default store**를 사용합니다. `<Provider>` 없이도 atom은 동작합니다.

그래도 Provider를 두는 이유:

1. **테스트** — 테스트마다 isolated store 주입 가능
2. **SSR / 여러 React root** — store 분리
3. **팀 컨벤션** — “전역 상태는 Provider 아래”라는 경계가 명확
4. **마이그레이션** — Context Provider와 같은 위치에 두면 트리 구조 파악이 쉬움

Phase 0의 Provider는 **빈 store로 앱 전체를 감싸기만** 합니다. 아직 atom을 읽거나 쓰는 코드는 없습니다.

---

## 3. Before → After

### Before (Phase 0 이전)

```json
"dependencies": {
  ...
  "zustand": "^5.0.12"
}
```

```tsx
// App.tsx — Context만 존재
<QueryClientProvider client={queryClient}>
  <ThemeProvider>
    <AuthProvider>
      ...
    </AuthProvider>
  </ThemeProvider>
</QueryClientProvider>
```

- `zustand`: 설치만 되어 있고 **소스 코드 import 0건**
- 전역 상태: `ThemeContext`, `AuthContext` (React Context API)

### After (Phase 0)

```json
"dependencies": {
  ...
  "jotai": "^2.x"
}
```

```tsx
// App.tsx — Jotai Provider 추가, Context 유지
<QueryClientProvider client={queryClient}>
  <Provider>           {/* ← 새로 추가 */}
    <ThemeProvider>
      <AuthProvider>
        ...
      </AuthProvider>
    </ThemeProvider>
  </Provider>
</QueryClientProvider>
```

- `zustand` 제거 → bundle/deps 정리
- **사용자-visible 동작 동일** (테마, 로그인, 피드 등)

---

## 4. 코드 walkthrough

### 4.1 package.json 변경

```json
"jotai": "^2.12.5"
```

- **jotai v2**: React 18/19 호환. 이 프로젝트는 React 19.2.0.
- caret(`^`) 범위: minor/patch 업데이트 허용 (Expo 프로젝트 일반 관례).

```diff
- "zustand": "^5.0.12"
```

- grep 결과 `from 'zustand'` import 없음 → 안전하게 제거.

### 4.2 App.tsx — Provider 위치

```tsx
import { Provider } from 'jotai';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Provider>
            <ThemeProvider>
              <AuthProvider>
                <ThemedStatusBar />
                <RootNavigator />
              </AuthProvider>
            </ThemeProvider>
          </Provider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

**Provider를 QueryClientProvider 안쪽, ThemeProvider 바깥쪽**에 둔 이유:

| 레이어 | 역할 |
|--------|------|
| `QueryClientProvider` | 서버/비동기 데이터 (React Query) — **Jotai로 옮기지 않음** |
| `Provider` (Jotai) | 클라이언트 전역 atom store |
| `ThemeProvider` / `AuthProvider` | Phase 1~3까지 유지, 이후 제거 예정 |

React Query hook(`useBlogs` 등)은 Jotai Provider **안·밖 모두** 동작하지만, “서버 상태는 Query, 클라이언트 상태는 Jotai” 경계를 트리 순서로 표현합니다.

---

## 5. 다른 파일과의 관계

```
package.json
    └── jotai (npm install → node_modules)

App.tsx
    └── <Provider> from 'jotai'
            └── ThemeContext / AuthContext (아직 실제 상태 소스)
                    └── screens, navigation, components

Phase 1 이후:
    src/atoms/theme.ts  → themeNameAtom, themeAtom
    src/atoms/auth.ts   → sessionAtom, ...
```

Phase 0에서는 **atoms 폴더 없음**. Provider만 “자리 표시”입니다.

---

## 6. Context vs Jotai vs Zustand (왜 Jotai?)

| | React Context | Zustand | Jotai |
|--|---------------|---------|-------|
| **이 프로젝트 Phase 0** | ✅ 사용 중 | ❌ 미사용 (제거) | ✅ Provider만 |
| **상태 단위** | Provider value 전체 | store slice | atom |
| **보일러플레이트** | Provider + Context | `create()` 한 번 | atom 선언 |
| **학습 목표** | 이미 익숙 | store 중심 | **atom 조합, derived atom** |
| **React Query와 역할 분담** | 가능 | 가능 | 가능 (권장: Query=서버, Jotai=클라이언트) |

Zustand를 쓰지 않고 Jotai를 선택한 이유 (마이그레이션 계획):

- atom 단위 구독을 **명시적으로** 배울 수 있음
- derived atom (`themeAtom` ← `themeNameAtom`) 패턴이 테마/인증에 잘 맞음
- `atomWithStorage` + AsyncStorage로 ThemeContext 영속화를 자연스럽게 대체 (Phase 1)

---

## 7. 흔한 실수

### 7.1 Provider 없이 atom을 쓰면?

동작은 합니다 (default store). 하지만 테스트·store 격리가 어려워져서 **Provider를 루트에 두는 것**이 권장됩니다.

### 7.2 Phase 0에서 Context를 제거하면?

테마·로그인이 깨집니다. Phase 0은 **Provider만 추가**하고 Context는 Phase 1~3에서 atom으로 **하나씩** 대체합니다.

### 7.3 React Query를 Jotai Provider 밖에 두면?

hook 자체는 동작하지만, 나중에 atom에서 `useQueryClient()` 등을 쓰려면 QueryClientProvider **안쪽**이어야 합니다. 현재 순서가 맞습니다.

### 7.4 zustand를 남겨두면?

번들·의존성 그래프만 불필요하게 커집니다. import 0건이면 제거가 맞습니다.

---

## 8. 직접 해보기

1. **의존성 확인**  
   ```bash
   npm ls jotai
   npm ls zustand   # (empty) — 없어야 함
   ```

2. **Provider 동작 관찰 (Phase 1 미리보기)**  
   - `src/atoms/debug.ts`에 `export const countAtom = atom(0)` 추가  
   - 아무 화면에서 `useAtom(countAtom)` — Provider 아래면 정상  
   - (연습 후 파일 삭제; Phase 0 커밋에는 넣지 않음)

3. **질문에 답하기**  
   - “서버에서 가져온 블로그 목록”은 Jotai atom에 넣어야 할까?  
   - **아니오** — React Query (`useBlogs`)가 담당. Jotai는 세션·테마 같은 **클라이언트 전역**만.

---

## 9. Phase 0 검증 체크리스트

- [ ] `npm install` 성공
- [ ] `jotai` in dependencies, `zustand` absent
- [ ] 앱 빌드/실행 (`npm start`)
- [ ] 로그인·테마 전환·피드 — **이전과 동일**
- [ ] Phase 1: `docs/atoms-theme.md` + `src/atoms/theme.ts`

---

## 10. 다음 단계

**Phase 1 — Theme atoms**

- `src/atoms/theme.ts` 생성
- `ThemeContext` → atom + `useTheme()` thin wrapper
- `docs/atoms-theme.md` 작성
