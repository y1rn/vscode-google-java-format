# Java format service

## Features

Startup as service with support of [google-java-format](https://github.com/google/google-java-format) plugin.

## Requirements

[redhat.java](https://marketplace.visualstudio.com/items?itemName=redhat.java)

## Usage

Do following configuration on settings.json after install:

```json
  "[java]": {
    //"editor.formatOnSave": true,
    "editor.defaultFormatter": "y1rn.java-format",
  },
```

## Extension Settings

- `google-java-format.style`: Enum string value [`GOOGLE`, `AOSP`]. The style name of google java format. Default is `GOOGLE`.
- `google-java-format.skipSortingImports`: Boolean value. Whether to fix the import order, but unused imports will still be removed. Default is `true`.
- `google-java-format.skipRemovingUnusedImports`: Boolean value. Whether to remove unused imports. Imports will still be sorted. Default is `false`.
