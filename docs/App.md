# App.tsx — Root Provider Tree

> **Phase 0–1** — Jotai Provider 추가, ThemeProvider 제거. Auth Context는 Phase 3까지 유지.

---

## 1. 이 파일의 역할

앱의 **최상위 Provider 트리**와 전역 인프라(`QueryClient`, Jotai store)를 구성합니다.  
`ThemedStatusBar`처럼 navigator 밖에서 테마가 필요한 UI도 여기서 렌더합니다.

---

## 2. Jotai 개념 (이 파일에서)

| 개념 | 사용 |
|------|------|
| **`Provider`** | Phase 0 추가 — atom store 범위 |
| **atom 구독** | Phase 1 — `ThemedStatusBar`가 `useTheme()` → `themeNameAtom` 간접 구독 |

React Query의 `QueryClientProvider`와 **형제가 아니라 중첩** — 서버 상태 vs 클라이언트 상태 경계.

---

## 3. Before → After

### Phase 0

```tsx
<QueryClientProvider>
  <Provider>              {/* Jotai */}
    <ThemeProvider>       {/* Context */}
      <AuthProvider>
        ...
```

### Phase 1 (현재)

```tsx
<QueryClientProvider>
  <Provider>              {/* Jotai — theme atoms live here */}
    <AuthProvider>        {/* Context — until Phase 3 */}
      <ThemedStatusBar />
      <RootNavigator />
```

**제거:** `ThemeProvider` — 테마는 `themeNameAtom` / `themeAtom`이 담당.

---

## 4. 코드 walkthrough

```tsx
import { Provider } from 'jotai';
import { useTheme } from './src/hooks/useTheme';

function ThemedStatusBar() {
  const { themeName } = useTheme();
  return <StatusBar style={themeName === 'light-neutral' ? 'dark' : 'light'} />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Provider>
            <AuthProvider>
              <ThemedStatusBar />
              <RootNavigator />
            </AuthProvider>
          </Provider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

### Provider 순서

1. **`GestureHandlerRootView`** — gesture-handler 필수 래퍼  
2. **`SafeAreaProvider`** — safe area insets  
3. **`QueryClientProvider`** — React Query (블로그 fetch, mutations)  
4. **`Provider` (Jotai)** — theme (Phase 1+), auth atoms (Phase 2+)  
5. **`AuthProvider`** — Phase 3에서 `AuthInitializer`로 대체 예정  

`ThemedStatusBar`는 `RootNavigator`와 **형제** — navigation mount 전에도 status bar 스타일 적용.

---

## 5. 다른 파일과의 관계

```
App.tsx
├── useTheme → src/hooks/useTheme.ts → src/atoms/theme.ts
├── AuthProvider → src/contexts/AuthContext.tsx (Phase 3 migration)
└── RootNavigator → src/navigation/index.tsx (also useTheme)
```

---

## 6. 흔한 실수

- **Jotai Provider를 QueryClient 바깥에 두기** — atom에서 query client 필요 시 깨짐 (현재 순서 유지)  
- **ThemeProvider 복원** — atom과 이중 상태; 하나만 사용  
- **ThemedStatusBar를 AuthProvider 밖으로** — 로그인 여부와 무관하게 테마 필요 → 현재 위치 OK  

---

## 7. 직접 해보기

Phase 3 이후 최종 트리를 종이에 그려 보세요:

```
QueryClientProvider → Provider → AuthInitializer → RootNavigator
```

`AuthProvider`가 사라진 자리에 `AuthInitializer`가 side effect만 담당하는 이유를 `docs/components-AuthInitializer.md`에서 확인.

---

## 8. Phase checklist

- [x] Phase 0: Jotai `Provider` added
- [x] Phase 1: `ThemeProvider` removed, `useTheme` from hooks
- [ ] Phase 3: `AuthProvider` → `AuthInitializer`
- [ ] Phase 4: finalize this doc
