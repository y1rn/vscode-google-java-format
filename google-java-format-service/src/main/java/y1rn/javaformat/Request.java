package y1rn.javaformat;

import lombok.Data;

@Data
public class Request {
  private Style styleName;
  private String data;
  private boolean skipSortingImports;
  private boolean skipRemovingUnusedImports;
}
