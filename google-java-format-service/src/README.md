# google-java-format-service

## Introduction

A simple HTTP service to format codes in [google-java-format](https://github.com/google/google-java-format).

Depends on google-java-format **1.7**.

## Requirements

- Java >= `11`

## Install

1. Download the jar file from [release page](https://github.com/ericpai/vscode-google-java-format-service/releases).

2. Run directly with `java -jar google-java-format-service-<VERSION>-jar-with-dependencies.jar -p <PORT>`

## Run parameters

- `p`: The port of the service. Default is `8030`.

## API

### POST /files

Format input codes with its parameters.

- Request content type: `application/json`
- Request body:
  ```json
  {
    "styleName": "GOOGLE|ASAP",
    "skipSortingImports": true | false,
    "skipRemovingUnusedImports": true | false,
    "data": "my codes"
  }
  ```

- Response content type: `text/html`
- Response body and code:
  - 200: Format successfully. The body is the codes formatted.
  - 400: Format failed. The body is the reason.