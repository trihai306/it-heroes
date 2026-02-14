---
description: Tạo trang mới trong FE project (React + TailAdmin)
---

# Workflow: Tạo trang mới trong FE

// turbo-all

## 1. Tạo file page component

Tạo file trong `FE/src/pages/[FeatureName]/[PageName].tsx` theo template chuẩn:

```tsx
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";

export default function PageName() {
  return (
    <>
      <PageMeta title="Page Title | IT Heroes" />
      <PageBreadcrumb pageTitle="Page Title" />
      <div className="space-y-6">
        {/* Dùng ComponentCard, Table, Button... KHÔNG dùng HTML thuần */}
      </div>
    </>
  );
}
```

## 2. Thêm route vào `FE/src/App.tsx`

- Import component page ở đầu file
- Thêm `<Route>` bên trong `<Route element={<AppLayout />}>` block

```tsx
import PageName from "./pages/FeatureName/PageName";
// ...
<Route path="/feature/page" element={<PageName />} />
```

## 3. Thêm navigation item vào Sidebar

Mở `FE/src/layout/AppSidebar.tsx`, thêm vào `navItems[]`:

- Nếu là menu đơn: thêm object `{ icon, name, path }`
- Nếu là submenu: thêm vào `subItems[]` của parent

```tsx
// Menu đơn
{ icon: <SomeIcon />, name: "Feature Name", path: "/feature/page" },

// Submenu
{
  icon: <SomeIcon />,
  name: "Feature Group",
  subItems: [
    { name: "Page Name", path: "/feature/page", new: true },
  ],
},
```

## 4. Tạo Zustand store (nếu cần state riêng)

Tạo `FE/src/store/useFeatureStore.ts`:

```tsx
import { create } from "zustand";
import { featureApi } from "@/services/api";

interface FeatureState {
  items: Item[];
  loading: boolean;
  fetchItems: () => Promise<void>;
}

export const useFeatureStore = create<FeatureState>((set) => ({
  items: [],
  loading: false,
  fetchItems: async () => {
    set({ loading: true });
    try {
      const items = await featureApi.list();
      set({ items, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
```

## 5. Thêm API endpoints (nếu cần)

Mở `FE/src/services/api.ts`, thêm types + API functions:

```tsx
export interface Item {
  id: string;
  name: string;
  // ...
}

export const featureApi = {
  list: async (): Promise<Item[]> => {
    const { data } = await api.get("/api/features");
    return data;
  },
  // ...
};
```

## 6. Kiểm tra

```bash
cd FE && npm run build
```

Verify:
- [ ] Page render đúng trong browser
- [ ] Navigation link hoạt động trong sidebar
- [ ] Breadcrumb hiển thị đúng title
- [ ] Dark mode hoạt động
- [ ] Responsive trên mobile
- [ ] Dùng UI components, KHÔNG dùng HTML thuần
