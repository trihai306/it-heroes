---
description: FE development workflow — chạy dev, build, và các tác vụ thường gặp
---

# Workflow: FE Development

// turbo-all

## Chạy Dev Server

```bash
cd FE && npm run dev
```

Dev server sẽ chạy trên `http://localhost:5173` (Vite default).

## Build Production

```bash
cd FE && npm run build
```

Output tại `FE/dist/`. Dùng `npm run preview` để test build locally.

## Chạy với Electron

```bash
cd electron && npm run dev:app
```

Sẽ khởi chạy cả FE dev server + Electron app.

## Lint

```bash
cd FE && npm run lint
```

## Component Lookup Nhanh

| Cần gì?           | Dùng component nào?                       | Import path                              |
|--------------------|-------------------------------------------|------------------------------------------|
| Nút bấm           | `Button`                                  | `@/components/ui/button/Button`          |
| Huy hiệu/tag      | `Badge`                                   | `@/components/ui/badge/Badge`            |
| Thông báo          | `Alert`                                   | `@/components/ui/alert/Alert`            |
| Avatar             | `Avatar`                                  | `@/components/ui/avatar/Avatar`          |
| Dialog/popup       | `Modal` + `useModal`                      | `@/components/ui/modal` + `@/hooks/useModal` |
| Menu dropdown      | `Dropdown` + `DropdownItem`               | `@/components/ui/dropdown/Dropdown`      |
| Bảng dữ liệu      | `Table/TableHeader/TableBody/TableRow/TableCell` | `@/components/ui/table`            |
| Card wrapper       | `ComponentCard`                           | `@/components/common/ComponentCard`      |
| Breadcrumb         | `PageBreadcrumb`                          | `@/components/common/PageBreadCrumb`     |
| SEO meta           | `PageMeta`                                | `@/components/common/PageMeta`           |
| Icon               | SVG components                            | `@/icons`                                |
| State management   | Zustand store                             | `@/store/useXxxStore`                    |
| API calls          | API service                               | `@/services/api`                         |
