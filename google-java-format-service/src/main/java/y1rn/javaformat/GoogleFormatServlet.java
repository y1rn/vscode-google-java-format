package y1rn.javaformat;

import com.google.googlejavaformat.java.Formatter;
import com.google.googlejavaformat.java.ImportOrderer;
import com.google.googlejavaformat.java.JavaFormatterOptions;
import com.google.googlejavaformat.java.RemoveUnusedImports;
import com.google.gson.Gson;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class GoogleFormatServlet extends HttpServlet {

  /** */
  private static final long serialVersionUID = 2834228695118524202L;

  Gson gson = new Gson();

  @Override
  public void doPost(HttpServletRequest request, HttpServletResponse response)
      throws ServletException, IOException {
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    response.setContentType("application/json");

    PrintWriter out = null;
    try {
      out = response.getWriter();
    } catch (IOException ex) {
      response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
      throw ex;
    }
    Request req = null;
    try {
      InputStream inputStream = request.getInputStream();
      String body = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);

      req = gson.fromJson(body, Request.class);

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

      response.setStatus(HttpServletResponse.SC_OK);
      out.print(
          gson.toJson(
              Differ.getTextEdit(
                  Arrays.asList(input.split("\n")), Arrays.asList(output.split("\n")))));
      // out.print(output);
    } catch (Throwable ex) {
      response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
      out.print(ex.getLocalizedMessage());
    } finally {
      out.close();
    }
  }
}
