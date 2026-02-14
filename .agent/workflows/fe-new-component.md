---
description: Tạo component mới trong FE project
---

# Workflow: Tạo component mới

// turbo-all

## 1. Xác định loại component

- **UI primitive** (Button, Card, Input...) → `FE/src/components/ui/[name]/`
- **Common/shared** (PageHeader, StatCard...) → `FE/src/components/common/`
- **Feature-specific** → cùng folder với page hoặc `FE/src/components/[feature]/`

## 2. Tạo component file

Đặt tại đúng folder, theo pattern:

```tsx
import type React from "react";

interface ComponentNameProps {
  children: React.ReactNode;
  variant?: "default" | "alt";   // Dùng union types cho variants
  size?: "sm" | "md" | "lg";     // Dùng union types cho sizes
  className?: string;             // LUÔN có prop className để extend
}

const ComponentName: React.FC<ComponentNameProps> = ({
  children,
  variant = "default",
  size = "md",
  className = "",
}) => {
  // Variant/size classes dùng object mapping
  const variantClasses = {
    default: "bg-white dark:bg-gray-900",
    alt: "bg-gray-50 dark:bg-gray-800",
  };

  return (
    <div className={`base-classes ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
};

export default ComponentName;
```

## 3. Quy tắc bắt buộc

- [ ] TypeScript interface cho props (KHÔNG dùng `any`)
- [ ] Default values cho optional props
- [ ] Hỗ trợ `className` prop để extend styling
- [ ] Dùng Tailwind design tokens từ `index.css` (brand-*, gray-*, success-*...)
- [ ] Hỗ trợ dark mode (`dark:` prefix)
- [ ] Composition pattern cho complex components (như Table)
- [ ] KHÔNG hardcode colors (`bg-[#xxx]`) — dùng theme tokens

## 4. Nếu là UI primitive

- Folder riêng: `FE/src/components/ui/[name]/`
- File: `ComponentName.tsx` hoặc `index.tsx`
- Variants + sizes dùng object mapping (xem `Button.tsx`, `Badge.tsx` làm mẫu)

## 5. Kiểm tra

```bash
cd FE && npm run build
```

Verify:
- [ ] Component render đúng
- [ ] Dark mode hoạt động
- [ ] Props interface đầy đủ
- [ ] Không có TypeScript errors
