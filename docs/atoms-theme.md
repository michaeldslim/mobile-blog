# src/atoms/theme.ts — 테마 Atom

> **Phase 1** — `ThemeContext`의 상태를 Jotai atom으로 이전합니다.

---

## 1. 이 파일의 역할

앱 전역 **테마 선택 상태**(`themeName`)를 Jotai atom으로 보관합니다.  
선택한 이름은 AsyncStorage에 자동 저장되고, `themeAtom`이 해당 이름에 맞는 색상·레이블 객체(`Theme`)를 **파생(derived)** 합니다.

Context의 `ThemeProvider` + `useState` + `useEffect` 조합을 atom 두 개로 대체합니다.

---

## 2. Jotai 개념

| Primitive | 이 파일에서 | 설명 |
|-----------|-------------|------|
| **`atomWithStorage`** | `themeNameAtom` | 값 변경 시 storage(AsyncStorage)에 자동 read/write |
| **`createJSONStorage`** | `themeStorage` | AsyncStorage를 Jotai storage API 형태로 감쌈 |
| **derived atom** | `themeAtom` | `(get) => ...` — 다른 atom을 읽어 계산된 값 반환 |
| **`getOnInit: true`** | `themeNameAtom` 옵션 | 마운트 시 storage에서 비동기로 값을 불러옴 |
| **`unwrap`** | `resolvedThemeNameAtom` | AsyncStorage → `Promise<ThemeName>`을 sync 값으로 풀어줌 |

### atom vs derived atom

```typescript
// primitive (storage-backed)
export const themeNameAtom = atomWithStorage(...);

// derived — themeNameAtom이 바뀔 때만 재계산
export const themeAtom = atom((get) => themes[get(themeNameAtom)]);
```

- `themeNameAtom`만 구독하는 컴포넌트 → 테마 **이름** 변경 시 re-render
- `themeAtom`만 구독하는 컴포넌트 → **객체**가 바뀔 때 re-render (이름 변경과 동일 타이밍)
- Context였다면 Provider `value` 전체가 바뀔 때 모든 consumer가 re-render될 수 있음

---

## 3. Before → After

### Before (`ThemeContext.tsx`)

```typescript
const [themeName, setThemeName] = useState(DEFAULT_THEME);

useEffect(() => {
  AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
    if (saved && saved in themes) setThemeName(saved);
  });
}, []);

const setTheme = async (name) => {
  setThemeName(name);
  await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
};

// value = { theme: themes[themeName], themeName, setTheme, allThemes }
```

- 상태 + storage + Provider가 한 파일에 혼재
- `setTheme` 호출마다 수동 `AsyncStorage.setItem`

### After (`src/atoms/theme.ts`)

```typescript
export const themeNameAtom = atomWithStorage(KEY, DEFAULT, themeStorage, { getOnInit: true });
export const themeAtom = atom((get) => themes[get(themeNameAtom)]);
```

- **데이터**만 atom에; UI hook(`useTheme`)은 `src/hooks/useTheme.ts`
- storage 쓰기는 `setThemeName` 시 atomWithStorage가 처리

---

## 4. 코드 walkthrough

### 4.1 Storage + validation

```typescript
const baseStorage = createJSONStorage<ThemeName>(() => AsyncStorage);

const themeStorage = {
  ...baseStorage,
  getItem: async (key, initialValue) => {
    const saved = await baseStorage.getItem(key, initialValue);
    if (saved && saved in themes) return saved;
    return initialValue;
  },
};
```

**왜 커스텀 `getItem`?**  
AsyncStorage에 잘못된 문자열(옛 버전 키, 수동 편집 등)이 있으면 `themes[saved]`가 `undefined`가 됩니다.  
기존 Context도 `saved in themes` 검사를 했으므로 **동일한 방어 로직**을 storage 레이어에 둡니다.

### 4.2 themeNameAtom

```typescript
export const themeNameAtom = atomWithStorage(
  THEME_STORAGE_KEY,   // 'mobile-blog-theme'
  DEFAULT_THEME,       // 'dark-green'
  themeStorage,
  { getOnInit: true },
);
```

- **`getOnInit: true`**: 앱 시작 시 AsyncStorage에서 값을 가져옴 (비동기)
- 첫 렌더는 `DEFAULT_THEME` → storage 로드 후 저장된 테마로 업데이트 (기존 Context와 같은 “짧은 flash” 가능)

### 4.3 resolvedThemeNameAtom (unwrap)

AsyncStorage는 **비동기**라 `atomWithStorage` + `createJSONStorage(() => AsyncStorage)`의 타입은  
`WritableAtom<ThemeName | Promise<ThemeName>, ...>` 입니다.

derived atom에서 `themes[get(themeNameAtom)]`처럼 쓰면 TypeScript/런타임 모두 깨질 수 있습니다.

```typescript
export const resolvedThemeNameAtom = unwrap(themeNameAtom, () => DEFAULT_THEME);
```

- storage 로드 **전**: fallback `DEFAULT_THEME` (`dark-green`)
- 로드 **후**: 저장된 테마 이름
- 기존 Context도 첫 렌더는 default → AsyncStorage 후 갱신과 **같은 UX**

### 4.4 themeAtom (derived)

```typescript
export const themeAtom = atom((get) => themes[get(resolvedThemeNameAtom)]);
```

- `resolvedThemeNameAtom`으로 sync `ThemeName` 확보 후 `Theme` 객체 반환
- **쓰기 불가** — 테마 변경은 `themeNameAtom`에 `setThemeName`

---

## 5. 다른 파일과의 관계

```
src/constants/theme.ts   themes, DEFAULT_THEME, THEME_STORAGE_KEY
        ↓
src/atoms/theme.ts       themeNameAtom, themeAtom
        ↓
src/hooks/useTheme.ts    useAtomValue / useSetAtom → useTheme() API
        ↓
screens, components      useTheme() (import 경로는 Context re-export 가능)
```

| 파일 | 관계 |
|------|------|
| `src/hooks/useTheme.ts` | atom 읽기/쓰기를 React hook으로 노출 |
| `src/contexts/ThemeContext.tsx` | `useTheme` re-export (import 경로 호환) |
| `App.tsx` | `ThemeProvider` 제거 — atom은 Jotai `<Provider>` 아래에서 동작 |
| `ProfileScreen` | `setTheme`, `allThemes` — hook API 동일 |

---

## 6. 흔한 실수

### 6.1 themeAtom에 직접 write 시도

```typescript
// ❌ derived atom은 writable이 아님
set(themes['dark-teal']); // 불가

// ✅ themeNameAtom만 갱신
set(themeNameAtom, 'dark-teal');
```

### 6.2 Provider 밖에서 useAtom

Phase 0에서 `App.tsx`에 `<Provider>`를 넣었으므로 앱 전체는 안전합니다.  
Storybook/테스트에서는 `<Provider>`로 감싸야 합니다.

### 6.3 storage validation 생략

validation 없으면 `themeName`이 `'invalid'`일 때 `themeAtom`이 `undefined` → 런타임 크래시.  
반드시 `getItem`에서 `in themes` 검사 유지.

---

## 7. 직접 해보기

1. **`isLightAtom` derived atom 추가**  
   ```typescript
   export const isLightAtom = atom((get) => get(themeNameAtom) === 'light-neutral');
   ```  
   `ThemedStatusBar`에서 `themeName === 'light-neutral'` 대신 `useAtomValue(isLightAtom)` 사용해 보기.

2. **React DevTools / console**  
   Profile에서 테마 변경 → `themeNameAtom` 값이 바뀌는지, 앱 재시작 후 유지되는지 확인.

3. **질문**  
   `allThemes`를 atom으로 만들 필요가 있을까?  
   → **없음** — `themes` 상수에서 `Object.values`면 충분 (변하지 않는 목록).

---

## 8. Migration complete (Theme)

- [x] `themeNameAtom` + `themeAtom` in `src/atoms/theme.ts`
- [x] `ThemeProvider` removed from `App.tsx`
- [x] `useTheme()` API unchanged for consumers
