

## Footer Links Scroll-to-Top + Stock Image Fixes

### Problem Summary

1. **Navigation Issue**: Footer links navigate to new pages but don't scroll to the top, leaving users mid-page
2. **Mismatched Stock Image**: One quest image shows a portrait instead of matching its content

---

### Solution 1: Scroll-to-Top Component

Create a `ScrollToTop` component that listens to route changes and scrolls the window to the top.

**New file: `src/components/ScrollToTop.tsx`**
```typescript
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
```

**Add to `src/App.tsx`** (inside BrowserRouter):
```typescript
<BrowserRouter>
  <ScrollToTop />
  <Routes>
    ...
  </Routes>
</BrowserRouter>
```

---

### Solution 2: Fix Mismatched Stock Image

**File: `src/pages/Quests.tsx`**

| Quest | Current Image | Problem | Replacement |
|-------|---------------|---------|-------------|
| Vintage Bookstore Crawl | `photo-1507003211169-0a1dd7228f2d` | Shows a person's face | `photo-1507842217343-583bb7270b66` (bookstore interior with shelves) |

The corrected image URL:
```
https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=300&fit=crop
```

This image shows a beautiful library/bookstore interior with books on shelves - perfectly matching the "Vintage Bookstore Crawl" vibe.

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/ScrollToTop.tsx` | **Create** - New component for scroll behavior |
| `src/App.tsx` | Add `<ScrollToTop />` inside BrowserRouter |
| `src/pages/Quests.tsx` | Replace bookstore crawl image URL |

---

### Technical Details

**ScrollToTop Logic:**
- Uses `useLocation()` hook from react-router-dom
- Listens for `pathname` changes via `useEffect`
- Calls `window.scrollTo(0, 0)` on every navigation
- Returns `null` (renders nothing)

**Image Selection Criteria:**
- Vintage Bookstore Crawl → warm, cozy bookstore with visible book shelves
- Alternative considered: `photo-1481627834876-b7833e8f5570` (library angle)
- Final choice: Classic bookstore shelving shot with warm lighting

