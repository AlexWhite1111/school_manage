### Card/Button 组件使用规范

#### UnifiedCard
- **variant**: 
  - **solid**: 默认，用于常规信息卡片。
  - **tinted**: 用于分组区域或弱层级容器，背景更浅。
  - **ghost**: 无边框背景，适用于嵌套在有背景容器中。
- **status**:
  - **default**: 常规。
  - **info/success/warning/danger**: 带语义色边框强调。
- **density**:
  - **comfortable**: 默认间距。
  - **compact**: 表格/表单密集区域使用。
- **title/extra/footer**: 页眉、右上角操作、页脚说明。
- **isHoverable**: 卡片可悬浮阴影，用于可点击或强调的卡片。

示例：
```tsx
<UnifiedCard title="分析概览" extra={<AppButton hierarchy="tertiary">设置</AppButton>}>
  内容区域
</UnifiedCard>
```

#### AppButton
- **hierarchy**:
  - **primary**: 关键主操作。
  - **secondary**: 次要操作，常规按钮。
  - **tertiary**: 低强调操作，近似文本按钮。
  - **link**: 链接风格。
- **tone**:
  - **brand**: 默认品牌色。
  - **neutral**: 中性文本色。
  - **success/warning/danger**: 语义操作色。
- **size**: **lg/md/sm** 对应页面、普通、小控件。
- **icon**: 左侧图标。
- **loading**: 加载态禁用并显示加载指示。
- **danger**: 强制危险色，覆盖 tone。

示例：
```tsx
<AppButton hierarchy="primary" tone="brand" size="md">保存</AppButton>
<AppButton hierarchy="secondary" tone="neutral" size="sm">取消</AppButton>
<AppButton hierarchy="link" tone="brand">了解更多</AppButton>
```

#### 选型建议
- **表单提交**: AppButton primary + brand。
- **删除/风险操作**: AppButton primary + danger 或 tone=danger。
- **次要操作**: AppButton secondary + neutral。
- **工具条/文本内操作**: AppButton tertiary 或 link。
- **信息展示卡**: UnifiedCard solid。
- **嵌套在背景容器的卡**: UnifiedCard ghost。
- **列表/表格密集区**: UnifiedCard density=compact；按钮 size=sm。

