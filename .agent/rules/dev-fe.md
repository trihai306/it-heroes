---
trigger: always_on
glob: FE/**
description: Rules for the IT Heroes FE project. React 19 + Vite 6 + Tailwind CSS v4 + TypeScript + Zustand.
---

# IT Heroes — Frontend Development Rules

## 1. Tech Stack (DO NOT change)

| Layer         | Technology                      |
|---------------|---------------------------------|
| Framework     | React 19 + TypeScript           |
| Bundler       | Vite 6 (`@vitejs/plugin-react`) |
| Styling       | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| State         | Zustand 5                       |
| Routing       | React Router 7 (`react-router`) |
| HTTP          | Axios                           |
| Icons         | SVG via `vite-plugin-svgr`      |
| Font          | Outfit (Google Fonts)           |
| Template      | TailAdmin React v2.1            |

Path alias: `@` → `FE/src/` (configured in `vite.config.ts` + `tsconfig.app.json`)

---

## 2. Component-First Development (CRITICAL)

> **KHÔNG dùng HTML thuần. LUÔN dùng component có sẵn.**

### 2.1 UI Components (`@/components/ui/`)

| Component      | Import path                         | Props chính                                     |
|---------------|--------------------------------------|--------------------------------------------------|
| `Button`      | `@/components/ui/button/Button`      | `size: "sm"\|"md"`, `variant: "primary"\|"outline"`, `startIcon`, `endIcon`, `disabled` |
| `Badge`       | `@/components/ui/badge/Badge`        | `variant: "light"\|"solid"`, `color: "primary"\|"success"\|"error"\|"warning"\|"info"\|"light"\|"dark"`, `size` |
| `Alert`       | `@/components/ui/alert/Alert`        | `variant: "success"\|"error"\|"warning"\|"info"`, `title`, `message`, `showLink` |
| `Avatar`      | `@/components/ui/avatar/Avatar`      | `src`, `size: "xsmall"\|"small"\|"medium"\|"large"\|"xlarge"\|"xxlarge"`, `status: "online"\|"offline"\|"busy"\|"none"` |
| `Modal`       | `@/components/ui/modal`              | `isOpen`, `onClose`, `showCloseButton`, `isFullscreen`, `className` |
| `Dropdown`    | `@/components/ui/dropdown/Dropdown`  | `isOpen`, `onClose`, `className` |
| `DropdownItem`| `@/components/ui/dropdown/DropdownItem` | `tag: "a"\|"button"`, `to`, `onClick`, `onItemClick` |
| `Table`       | `@/components/ui/table`              | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` (composition pattern) |

### 2.2 Common Components (`@/components/common/`)

| Component         | Mục đích                               |
|-------------------|----------------------------------------|
| `ComponentCard`   | Card wrapper với title, desc, border   |
| `PageBreadcrumb`  | Breadcrumb + page title                |
| `PageMeta`        | SEO meta tags (`react-helmet-async`)   |
| `ScrollToTop`     | Auto scroll khi chuyển route           |
| `ThemeToggleButton` | Dark/light mode toggle               |
| `GridShape`       | Decorative background grid             |
| `ChartTab`        | Tab switcher cho charts                |

### 2.3 Layout Components (`@/layout/`)

| Component    | Mục đích                           |
|-------------|--------------------------------------|
| `AppLayout`  | Main layout wrapper (Sidebar + Header + Outlet) |
| `AppSidebar` | Sidebar navigation                   |
| `AppHeader`  | Top header bar                       |
| `Backdrop`   | Mobile sidebar overlay               |

---

## 3. Quy tắc sử dụng

### ❌ KHÔNG LÀM
```tsx
// ❌ Dùng <button> thuần
<button className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>

// ❌ Dùng <table> thuần
<table><tr><td>Data</td></tr></table>

// ❌ Dùng <div> làm modal
<div className="fixed inset-0 bg-black/50">...</div>

// ❌ Inline badge bằng <span>
<span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Active</span>

// ❌ Hardcode avatar
<img src={url} className="w-10 h-10 rounded-full" />
```

### ✅ LÀM ĐÚNG
```tsx
// ✅ Dùng Button component
import Button from "@/components/ui/button/Button";
<Button variant="primary" size="md" startIcon={<SaveIcon />}>Save</Button>

// ✅ Dùng Table components
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";

// ✅ Dùng Modal component + useModal hook
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
const { isOpen, openModal, closeModal } = useModal();

// ✅ Dùng Badge component
import Badge from "@/components/ui/badge/Badge";
<Badge variant="light" color="success">Active</Badge>

// ✅ Dùng Avatar component
import Avatar from "@/components/ui/avatar/Avatar";
<Avatar src={url} size="medium" status="online" />
```

---

## 4. State Management

- **Global state**: Zustand stores tại `@/store/`
- Mỗi domain 1 store file (vd: `useAgentStore.ts`, `useTaskStore.ts`)
- Pattern: `create<StateType>((set, get) => ({...}))`
- Side effects (API calls) nằm trong store actions
- **KHÔNG dùng** `useContext` cho server state — chỉ dùng cho UI state (Sidebar, Theme)

```tsx
// ✅ Pattern chuẩn
import { useAgentStore } from "@/store/useAgentStore";
const { agents, fetchAgents } = useAgentStore();
```

---

## 5. API Layer

- Tất cả API calls qua `@/services/api.ts`
- Dùng Axios instance chung (`api`)
- Export types + API functions cùng file
- **KHÔNG gọi `fetch()` hoặc `axios` trực tiếp** trong component/store

---

## 6. Styling Rules

### Tailwind CSS v4 Theme Tokens (dùng từ `index.css`)
- **Brand**: `brand-50` → `brand-950` (primary blue: `#465fff`)
- **Status**: `success-*`, `error-*`, `warning-*`
- **Neutral**: `gray-25` → `gray-950`, `gray-dark`
- **Shadows**: `shadow-theme-xs/sm/md/lg/xl`
- **Font**: `font-outfit`

### Quy tắc
- Dùng design tokens đã define, **KHÔNG hardcode** màu (`bg-[#xxx]`)
- Dark mode: dùng `dark:` prefix
- Responsive: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Spacing / sizing: dùng Tailwind scale tiêu chuẩn
- Custom scrollbar: dùng `custom-scrollbar` utility class
- No scrollbar: dùng `no-scrollbar` utility class
- Menu styles: dùng `menu-item`, `menu-item-active`, `menu-dropdown-item` utility classes

---

## 7. File & Folder Structure

```
src/
├── components/
│   ├── ui/          # Reusable UI primitives (Button, Modal, Table...)
│   ├── common/      # Shared utilities (PageBreadcrumb, ComponentCard...)
│   └── header/      # Header-specific components
├── context/         # React Context (UI-only: Sidebar, Theme)
├── hooks/           # Custom hooks (useModal, useGoBack...)
├── icons/           # SVG icons (import via index.ts barrel)
├── layout/          # Layout components (AppLayout, AppSidebar...)
├── pages/           # Route pages, grouped by feature
│   ├── Dashboard/
│   └── Agents/
├── services/        # API layer (api.ts)
├── store/           # Zustand stores
├── App.tsx          # Router config
├── main.tsx         # Entry point
└── index.css        # Tailwind theme + global styles
```

### Naming Conventions
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Stores: `useCamelCaseStore.ts`
- Services: `camelCase.ts`
- Pages: PascalCase folder + PascalCase file
- Icons: barrel export từ `@/icons/index.ts`

---

## 8. Icons (CRITICAL — NO EMOJI)

> **KHÔNG dùng emoji (🤖 💬 📋 ✅ ⚡ 🗑️...) làm icon trong UI. LUÔN dùng SVG icon từ `@/icons`.**

- 58+ SVG icons tại `@/icons/`
- Import qua barrel: `import { GridIcon, BoxCubeIcon, ChevronDownIcon } from "@/icons"`
- Thêm icon mới: tạo `.svg` file + export trong `index.ts`
- **KHÔNG inline SVG** trong component (trừ khi icon rất đặc thù)

### Icon mapping phổ biến

| Mục đích              | Icon Component        |
|----------------------|----------------------|
| Agent / Bot          | `BoxCubeIcon`        |
| Chat / Message       | `ChatIcon`           |
| Task / Todo          | `TaskIcon`           |
| List / Config        | `ListIcon`           |
| Calendar             | `CalenderIcon`       |
| Dashboard / Grid     | `GridIcon`           |
| Add / Create         | `PlusIcon`           |
| Delete / Remove      | `TrashBinIcon`       |
| Edit / Pencil        | `PencilIcon`         |
| Send                 | `PaperPlaneIcon`     |
| Check / Success      | `CheckCircleIcon`    |
| Warning              | `AlertIcon`          |
| Error                | `ErrorIcon`          |
| Info                 | `InfoIcon`           |
| User                 | `UserIcon`           |
| Settings / Plugin    | `PlugInIcon`         |
| Bolt / Active        | `BoltIcon`           |
| Arrow (up/down/left/right) | `ArrowUpIcon`, `ArrowDownIcon`, `AngleLeftIcon`, `AngleRightIcon` |
| Close                | `CloseIcon`          |
| Copy                 | `CopyIcon`           |
| Time                 | `TimeIcon`           |
| Download             | `DownloadIcon`       |
| Docs                 | `DocsIcon`           |
| Chevron              | `ChevronDownIcon`, `ChevronUpIcon`, `ChevronLeftIcon` |

### ❌ KHÔNG LÀM
```tsx
// ❌ Dùng emoji làm icon
<span>🤖</span>
<Button>💬 Chat</Button>
<h3>📋 Task Board</h3>

// ❌ Dùng emoji làm avatar placeholder
<div className="text-2xl">🤖</div>
```

### ✅ LÀM ĐÚNG
```tsx
// ✅ Import SVG icons từ barrel
import { BoxCubeIcon, ChatIcon, TaskIcon, TrashBinIcon } from "@/icons";

// ✅ Dùng trong Button
<Button startIcon={<ChatIcon />}>Chat</Button>

// ✅ Dùng độc lập
<BoxCubeIcon className="h-5 w-5 text-brand-500" />

// ✅ Avatar fallback — dùng icon, không dùng emoji
<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
  <UserIcon className="h-5 w-5 text-gray-500" />
</div>
```

---

## 9. Routing

- Cấu hình routes tại `App.tsx`
- Routes trong `AppLayout` wrapper sẽ có Sidebar + Header
- Navigation items cấu hình tại `AppSidebar.tsx` → `navItems[]`
- Khi thêm page mới: (1) tạo component, (2) thêm route, (3) thêm nav item

---

## 10. Hooks

| Hook        | Mục đích                   | Usage                                         |
|-------------|----------------------------|-----------------------------------------------|
| `useModal`  | Toggle modal state         | `const { isOpen, openModal, closeModal } = useModal()` |
| `useGoBack` | Navigate back              | `const goBack = useGoBack()`                  |
| `useSidebar`| Sidebar context            | `const { isExpanded, toggleSidebar } = useSidebar()` |

---

## 11. Page Template

Khi tạo page mới, dùng template sau:

```tsx
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";

export default function MyNewPage() {
  return (
    <>
      <PageMeta title="Page Title | IT Heroes" />
      <PageBreadcrumb pageTitle="Page Title" />
      <div className="space-y-6">
        {/* Content here — dùng ComponentCard, Table, Button... */}
      </div>
    </>
  );
}
```
