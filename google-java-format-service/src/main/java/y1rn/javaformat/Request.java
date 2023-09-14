package y1rn.javaformat;

import com.google.googlejavaformat.java.JavaFormatterOptions.Style;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class Request {
  private Style style;
  private String data;
  private boolean skipSortingImports;
  private boolean skipRemovingUnusedImports;
  private Range range;

  @Data
  @ToString
  @NoArgsConstructor
  @AllArgsConstructor
  public static class Range {
    private Integer start;
    private Integer end;
  }
}
