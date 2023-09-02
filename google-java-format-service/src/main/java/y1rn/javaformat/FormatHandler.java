package y1rn.javaformat;

import com.google.googlejavaformat.java.Formatter;
import com.google.googlejavaformat.java.ImportOrderer;
import com.google.googlejavaformat.java.JavaFormatterOptions;
import com.google.googlejavaformat.java.RemoveUnusedImports;
import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class FormatHandler implements HttpHandler {

  Gson gson = new Gson();

  @Override
  public void handle(HttpExchange ex) throws IOException {
    if (!"POST".equalsIgnoreCase(ex.getRequestMethod())) {
      ex.sendResponseHeaders(405, -1); // Method Not Allowed
      ex.close();
      throw new IOException("abc");
    }

    OutputStream out = null;
    try {
      ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");

      out = ex.getResponseBody();

      InputStream inputStream = ex.getRequestBody();
      String body = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);

      Request req = gson.fromJson(body, Request.class);

      JavaFormatterOptions options =
          JavaFormatterOptions.builder()
              .style(req.getStyleName().GetGoogleJavaFormatterStyle())
              .build();
      String input = req.getData();
      String output = new Formatter(options).formatSource(input);
      if (!req.isSkipRemovingUnusedImports()) {
        output = RemoveUnusedImports.removeUnusedImports(output);
      }
      if (!req.isSkipSortingImports()) {
        output =
            ImportOrderer.reorderImports(output, req.getStyleName().GetGoogleJavaFormatterStyle());
      }
      byte[] jsonData =
          gson.toJson(
                  Differ.getTextEdit(
                      Arrays.asList(input.split("\n")), Arrays.asList(output.split("\n"))))
              .getBytes(StandardCharsets.UTF_8);
      ex.sendResponseHeaders(200, jsonData.length);
      out.write(jsonData);
    } catch (Throwable e) {
      if (out != null) {
        byte[] msg = e.getMessage().getBytes(StandardCharsets.UTF_8);
        ex.sendResponseHeaders(400, msg.length);
        out.write(msg);
      }

    } finally {
      if (out != null) {
        out.close();
      }
    }
  }
}

