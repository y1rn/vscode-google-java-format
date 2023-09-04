package y1rn.javaformat;

import com.google.googlejavaformat.java.JavaFormatterOptions.Style;

import lombok.Data;

@Data
public class Request {
  private Style style;
  private String data;
  private boolean skipSortingImports;
  private boolean skipRemovingUnusedImports;
}
