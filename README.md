# md3

从给定的十六进制颜色或图像中提取主题色并生成 Material Dynamic 色板.
支持预览 ANSI 输出, 暗色模式, 对比度调整与多种变体.

```
Usage:
    md3 --source <hex> [Options]
    md3 --image <file> [Options]

Options:
    --source <hex>       以 16 进制颜色作为 source (例如"#ff0000")
    --image <file>       以 PNG 图像作为 source (会量化并选取主色)
    --output <file>      输出 JSON 文件 (不指定则写入 stdout)
    --preview            在 stderr 输出 ANSI 彩色预览
    --dark
    --contrast <number>  数值范围为 -1 到 1. -1 表示最小对比度, 0 表示标准 (即按规范设计), 1 表示最大对比度.
    --variant <type>     主题变体, 支持: monochrome, neutral, vibrant, expressive, fidelity, content, rainbow, fruit-salad, tonal-spot
    --version
```
