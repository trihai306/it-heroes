---
description: React UI development standards for the Chibi Office AI renderer
globs: ["apps/renderer/**/*.jsx", "apps/renderer/**/*.tsx", "apps/renderer/**/*.css"]
---

# React UI Development Rules

## UI Framework: Ant Design (antd v5)

1. **Always use Ant Design components** — never use raw HTML elements when an antd equivalent exists:
   - `<Button>` not `<button>`
   - `<Input>` not `<input>`
   - `<Select>` not `<select>`
   - `<Modal>` not custom modal divs
   - `<Card>`, `<Tag>`, `<Badge>`, `<Alert>`, `<Tabs>`, `<Menu>`, `<Form>`, `<Space>`, `<Flex>`, `<Typography>`, `<Popconfirm>`, `<Tooltip>`, `<Row>`/`<Col>`, `<Empty>`, `<Segmented>`, etc.
   - Use `<Layout>`, `<Layout.Sider>`, `<Layout.Header>`, `<Layout.Content>` for page structure
   - Use `<Typography.Title>`, `<Typography.Text>`, `<Typography.Paragraph>` instead of raw `<h1>`–`<h6>`, `<span>`, `<p>`

2. **Use `@ant-design/icons`** for all icons — do not use raw SVGs, icon fonts, or emoji-based icon systems.

3. **No Tailwind CSS** — this project does not use Tailwind. Do not add Tailwind classes or directives.

4. **No plain CSS for layout** — use antd's `<Flex>`, `<Space>`, `<Row>`/`<Col>` for layout instead of writing custom flexbox/grid CSS. Inline `style={{}}` is acceptable for fine-tuning only.

5. **Theming** — all colors and tokens come from the `ConfigProvider` theme in `main.jsx`. Do not hardcode colors outside the theme system except in `index.css` overrides.

## Color Palette (Professional Dark)

- Primary: `#6366f1` (Indigo)
- Accent: `#818cf8`, `#a5b4fc` (Light indigo)
- Success: `#22c55e` · Warning: `#eab308` · Error: `#ef4444`
- Background levels: `#0f1117` → `#13151f` → `#181a24` → `#1e2030`
- Text: use `rgba(255,255,255, 0.92/0.55/0.35)` — never use named colors like `#5a6a8a`
- Borders: `rgba(255,255,255, 0.05–0.08)`

## Patterns

- **State management**: Zustand stores in `src/stores/`
- **Dangerous actions**: wrap in `<Popconfirm>` before executing
- **Dialogs**: use `Modal.confirm()` or `<Modal>` component — never `window.prompt()` or `window.confirm()`
- **Notifications**: use antd `message` or `notification` API
- **Font**: Inter for UI, JetBrains Mono for code/terminal
