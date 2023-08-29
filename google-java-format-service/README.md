# google-java-format-service

## Introduction

A simple HTTP service to format codes in [google-java-format](https://github.com/google/google-java-format)

Depends on google-java-format **1.7**

## Requirements

- Java >= `11`

## Install

1. Download the google-java-format-`<VERSION>`-jar-with-dependencies.jar file from [release page](https://github.com/google/google-java-format/releases)
2. build jar with `mvn package`
3. Run with `java -cp google-java-format-service.jar:google-java-format-<VERSION>-jar-with-dependencies.jar cn.gjfs.App -p <PORT>`


## Run parameters

- `p`: The port of the service. Default is `8030`

## API

### POST /files

Format input codes with its parameters

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
  - 200: Format successfully. The body is the codes formatted
  - 400: Format failed. The body is the reason
