# Self-hosted civic typography

These unmodified variable WOFF2 files come from Adobe's official open-source repositories. Both use the SIL Open Font License 1.1; original copyright notices and complete license terms accompany each family in this directory.

- Source Sans 3 upright: [pinned source](https://github.com/adobe-fonts/source-sans/blob/87b37a2daaed80fcb8e8ccb0085c4d72ddade12e/WOFF2/VF/SourceSans3VF-Upright.ttf.woff2), [license](./LICENSE-SourceSans3.md).
- Source Serif 4 Roman: [pinned source](https://github.com/adobe-fonts/source-serif/blob/80d3f8894c09c937bebfa9011247d2e1c79fd6f4/WOFF2/VAR/SourceSerif4Variable-Roman.ttf.woff2), [license](./LICENSE-SourceSerif4.md).

`next/font/local` serves these fonts with the application and preserves the existing `--font-source-sans` and `--font-source-serif` design tokens and swap behavior. Builds and page loads no longer depend on Google Fonts availability. Only upright/Roman styles are included, matching the previous configuration. These are full upstream character sets rather than generated Latin-only subsets; their combined compressed size is approximately 600 KB.
