

## Fix Street Art Walking Tour - Image & Location Update

### Change Summary
Update the "Street Art Walking Tour" quest with a proper colorful mural image and change the location to Wynwood Walls.

---

### File Change

**File:** `src/pages/Quests.tsx` (lines 22-29)

| Field | Current Value | New Value |
|-------|---------------|-----------|
| location | Mission District | Wynwood Walls |
| image | `photo-1499781350541-7783f6c6a0c8` | `photo-1569700296499-d5671c74cb3d` |

**Updated quest object:**
```typescript
{
  title: 'Street Art Walking Tour',
  location: 'Wynwood Walls',
  categoryKey: 'art' as const,
  duration: '2 hours',
  participants: 89,
  image: 'https://images.unsplash.com/photo-1569700296499-d5671c74cb3d?w=400&h=300&fit=crop',
},
```

The new image shows vibrant, colorful street murals that perfectly match the Wynwood Walls street art experience.

