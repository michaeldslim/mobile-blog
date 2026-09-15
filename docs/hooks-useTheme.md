# src/hooks/useTheme.ts — useTheme Hook

> **Phase 1** — Jotai atom을 React 컴포넌트가 쓰기 쉬운 API로 감쌉니다.

---

## 1. 이 파일의 역할

컴포넌트가 테마 정보를 쓸 때 **`useTheme()` 하나**만 호출하면 됩니다.  
내부에서는 Jotai의 `useAtomValue` / `useSetAtom`으로 `themeNameAtom`, `themeAtom`을 읽고 씁니다.

**공개 API를 Context 시절과 동일하게** 유지해, 화면 10곳+의 import를 바꿀 필요가 없습니다.

---

## 2. Jotai 개념

| Hook | 사용처 | 설명 |
|------|--------|------|
| **`useAtomValue(atom)`** | `theme`, `themeName` 읽기 | atom 값만 구독; setter 없음 → 불필요한 re-render 감소 |
| **`useSetAtom(atom)`** | `setTheme` | 값은 안 읽고 **쓰기만** — themeName 변경 시 이 hook만 쓰는 컴포넌트는 이름 변경에 re-render 안 됨 |
| **`useAtom(atom)`** | (미사용) | `[value, setValue]` — 읽기+쓰기 둘 다 필요할 때 |

### 왜 `useAtom` 대신 분리?

```typescript
const theme = useAtomValue(themeAtom);
const themeName = useAtomValue(resolvedThemeNameAtom); // sync — see docs/atoms-theme.md unwrap
const setThemeName = useSetAtom(themeNameAtom);       // write still goes to storage atom
```

- `setTheme`만 prop으로 넘기는 자식은 atom 값 변경에 re-render되지 않게 설계 가능
- 읽기 전용 구독이 명확

---

## 3. Before → After

### Before

```typescript
// ThemeContext.tsx
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
```

- Provider 밖이면 **에러**
- Context value 객체 전체에 implicit 구독

### After

```typescript
export function useTheme(): UseThemeResult {
  const theme = useAtomValue(themeAtom);
  const themeName = useAtomValue(resolvedThemeNameAtom);
  const setThemeName = useSetAtom(themeNameAtom);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeName(name);
  }, [setThemeName]);

  return { theme, themeName, setTheme, allThemes: Object.values(themes) };
}
```

- Jotai default store + `<Provider>` — Provider 밖도 동작하지만, 앱은 Provider 안
- **`setTheme` 시그니처**: Context는 `async`, 지금은 `void` — 호출부에서 `await setTheme(...)` 없음 → **호환**

---

## 4. 코드 walkthrough

### 4.1 반환 타입

```typescript
export interface UseThemeResult {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  allThemes: Theme[];
}
```

`ProfileScreen`이 `themeName`, `setTheme`, `allThemes`로 테마 �icker UI를 그립니다.  
필드 이름·타입을 바꾸지 않았습니다.

### 4.2 setTheme + useCallback

```typescript
const setTheme = useCallback(
  (name: ThemeName) => setThemeName(name),
  [setThemeName],
);
```

- `setThemeName` from `useSetAtom`은 **안정적인 참조** (리렌더마다 바뀌지 않음)
- `useCallback`으로 `setTheme`도 안정화 → memoized 자식에 prop으로 넘길 때 유리

### 4.3 allThemes

```typescript
allThemes: Object.values(themes),
```

- atom 아님 — `constants/theme.ts`의 정적 맵
- 매 `useTheme()` 호출마다 새 배열 생성; 목록이 3개뿐이라 성능 이슈 없음  
  (최적화하려면 모듈 레벨 `const ALL_THEMES = Object.values(themes)` 가능)

---

## 5. 다른 파일과의 관계

| Consumer | 사용 필드 |
|----------|-----------|
| `FeedScreen`, `PostCard`, … | `theme` |
| `ProfileScreen` | `theme`, `themeName`, `setTheme`, `allThemes` |
| `CalendarScreen` | `theme`, `themeName` |
| `App.tsx` `ThemedStatusBar` | `themeName` |
| `navigation/index.tsx` | `theme` |

**Import 경로 두 가지 모두 동작:**

```typescript
import { useTheme } from '../contexts/ThemeContext'; // re-export
import { useTheme } from '../hooks/useTheme';         // 직접
```

---

## 6. 흔한 실수

### 6.1 atom 파일에서 React hook import

atom 정의(`src/atoms/theme.ts`)에는 **hook 금지** — 순환 참조·SSR 이슈.  
hook은 이 파일(`useTheme.ts`)에만.

### 6.2 useTheme 안에서 매번 새 setTheme 함수

`useCallback` 없이 `(name) => setThemeName(name)`만 써도 동작은 하지만,  
`React.memo`된 자식에 넘기면 불필요 re-render.

### 6.3 Provider 제거 후 Context import

`ThemeProvider`는 삭제됐지만 `useTheme` re-export는 `ThemeContext.tsx`에 남음 — **breaking change 없음**.

---

## 7. 직접 해보기

1. **`App.tsx`에서 import 경로 변경**  
   `'./src/hooks/useTheme'` 사용 중 — 다른 화면 하나를 `hooks/useTheme`로 바꿔 보고 동작 동일한지 확인.

2. **구독 분리 실험**  
   `ThemedStatusBar`에서 `useAtomValue(themeNameAtom)`만 직접 사용해 보기 — `useTheme()`보다 의존성이 적음.

3. **Exercise**  
   `useThemeName()` hook을 추가해 `themeName` + `setTheme`만 반환하게 분리해 보세요.

---

## 8. Migration complete (Hook)

- [x] `useTheme()` returns same shape as Context era
- [x] `ThemeContext.tsx` → re-export only
