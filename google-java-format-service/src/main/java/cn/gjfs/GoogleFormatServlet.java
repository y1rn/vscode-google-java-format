package cn.gjfs;

import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.google.googlejavaformat.java.Formatter;
import com.google.googlejavaformat.java.ImportOrderer;
import com.google.googlejavaformat.java.JavaFormatterOptions;
import com.google.googlejavaformat.java.RemoveUnusedImports;
import com.google.gson.Gson;

public class GoogleFormatServlet extends HttpServlet {

  /** */
  private static final long serialVersionUID = 2834228695118524202L;

  @Override
  public void doPost(HttpServletRequest request, HttpServletResponse response)
      throws ServletException, IOException {
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    response.setContentType("application/json");

    Gson gson = new Gson();
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
      String output = new Formatter(options).formatSource(req.getData());
      if (!req.isSkipRemovingUnusedImports()) {
        output = RemoveUnusedImports.removeUnusedImports(output);
      }
      if (!req.isSkipSortingImports()) {
        output = ImportOrderer.reorderImports(output);
      }

      response.setStatus(HttpServletResponse.SC_OK);
      out.print(output);
    }catch (Throwable ex) {
      response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
      out.print(ex.getLocalizedMessage());
    } finally {
      out.close();
    }
  }
}
