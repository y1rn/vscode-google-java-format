# google-java-format-service README

## Features

A faster and fully support of [google-java-format](https://github.com/google/google-java-format) plugin.

### Why service?

In traditional implemention, JVM launching happens after `.java` files are saved. Launching JVM is a heavy and slow process during coding in VSCode.

Use a HTTP service to format code will gen a better experience than using JAR directly.

## Requirements

- Java >= `11`
- [google-java-format-serivice](google-java-format-service/README.md) is installed and running.

## Extension Settings

- `gjfs.address`: The endpoint of google-java-format-service. Default is `localhost:8030`.
- `gjfs.style`: Enum string value [`GOOGLE`, `AOSP`]. The style name of google java format. Default is `GOOGLE`.
- `gjfs.skipSortingImports`: Boolean value. Whether to fix the import order, but unused imports will still be removed. Default is `true`.
- `gjfs.skipRemovingUnusedImports`: Boolean value. Whether to remove unused imports. Imports will still be sorted. Default is `false`.

To use this formatter as default one for java, do the following steps:

1. Open any .java files in your workspace.
1. Press `F1`, search `Formatter Document`.
1. Set `google-java-format-service` as the default Java foramtter tool.

## Known Issues

## Release Notes

### v1.0.0

First release.

**Enjoy!**
